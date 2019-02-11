import { Constraint, constraints, constraints2json, data2schema, schema2asp } from 'draco-core';
import { TopLevelSpec } from 'vega-lite/build/src/spec';
import Clingo from 'wasm-clingo';
import { getModels, models2vl } from './spec';

/**
 * Options for Draco.
 */
export interface Options {
  /**
   * Empty means all.
   */
  constraints?: string[];

  /**
   * Weight for the soft constraints.
   */
  weights?: Array<{
    name: string;
    value: number;
  }>;

  /**
   * Number of models.
   */
  models?: number;
}

export interface Model {
  costs: number[];
  facts: string[];
  violations: Violation[];
}

export interface Violation extends Constraint {
  witness: string;
}

export interface SolutionSet {
  models: Model[];  // ASP models
  programs: string[];
  specs: TopLevelSpec[];  // vega-lite specs
}

export interface FieldTypes {
  [field: string]: string
}

export interface Schema {
  stats: any;
  size: number;
}

export interface ConstraintSet {
  soft: Constraint[],
  hard: Constraint[]
}

/**
 * Draco is a solver that recommends visualization specifications based off
 * partial specs.
 */
class Draco {
  public initialized = false;

  private Module: any;
  private stdout: string = '';
  private schema: Schema | null;
  private soft: Constraint[];
  private hard: Constraint[];
  private constraints: any;

  /**
   * @param url The base path of the server hosting this.
   * @param updateStatus Optional callback to log updates for status changes.
   */
  constructor(url: string, updateStatus?: (text: string) => void) {
    // add / if it's missing from the URL
    if (url.substr(url.length - 1) !== '/') {
      url += '/';
    }

    const that = this;
    const m = {
      // Where to locate clingo.wasm
      locateFile: (file: string) => `${url}${file}`,

      // Status change logger
      setStatus: updateStatus || console.log,

      print(text: string) {
        that.stdout += text;
      },

      // Dependencies
      totalDependencies: 0,
      monitorRunDependencies(left: number) {
        m.totalDependencies = Math.max(m.totalDependencies, left);
        m.setStatus(
          left
            ? 'Preparing... (' + (m.totalDependencies - left) + '/' + m.totalDependencies + ')'
            : 'All downloads complete.'
        );
      },

      printErr(err: Error) {
        if (err) {
          m.setStatus('Received output on stderr.');
          console.warn(err);
        }
      },
    };

    this.Module = m;
    this.schema = null;

    this.hard = constraints2json(constraints.HARD);
    this.soft = constraints2json(constraints.SOFT, constraints.WEIGHTS);

    this.constraints = constraints;
  }

  /**
   * Initializes the underlying solver.
   *
   * @returns A promise that resolves when the solver is ready.
   */
  public init() {
    return new Promise((resolve: (draco: Draco) => void, reject: () => void) => {
      this.Module.setStatus('Downloading...');
      this.Module.onRuntimeInitialized = () => {
        this.initialized = true;
        resolve(this);
      };

      Clingo(this.Module);
    });
  }

  /**
   * Solves with the given constraints.
   *
   * @param program The constraint to solve (e.g. the partial specification in ASP)
   * @param options Options for solving.
   *
   * @returns The solution from Clingo as JSON.
   */
  public solve(program: string, options: Options = {}): SolutionSet {
    if (!this.initialized) {
      throw Error('Draco is not initialized. Call `init() first.`');
    }

    this.Module.setStatus('Running Draco Query...');

    const dataDecl = this.getDataDeclaration();
    program += dataDecl;

    const programs = options.constraints || Object.keys(this.constraints);

    program += programs.map((name: string) => (this.constraints as any)[name]).join('\n\n');

    const opt = [
      '--outf=2', // JSON output
      '--opt-mode=OptN', // find multiple optimal models
      '--quiet=1', // only output optimal models
      '--project', // every model only once
      options.models === undefined ? 1 : options.models,
    ]
      .concat((options.weights || []).map(d => `-c ${d.name}=${d.value}`))
      .join(' ');

    // reset stdout before running clingo
    this.stdout = '';

    this.Module.ccall('run', 'number', ['string', 'string'], [program, opt]);

    const result = JSON.parse(this.stdout);
    const models = getModels(result, this.soft);

    if (models.length > (options.models || 1)) {
      throw new Error('Too many models.');
    }

    const specs = models2vl(models);

    // done
    this.Module.setStatus('');

    return { models, programs, specs };
  }

  public getSchema(): Schema | null {
    return this.schema;
  }

  public prepareData(data: any[]) {
    this.schema = data2schema(data);
  }

  public updateAsp(aspSet: any) {
    this.constraints = {
      ...this.constraints,
      ...aspSet
    };
  }

  public getConstraintSet(): ConstraintSet {
    return {
      soft: this.soft,
      hard: this.hard
    }
  }

  private getDataDeclaration(): string {
    if (!this.schema) {
      return '';
    }

    return schema2asp(this.schema).join('\n');
  }
}

export default Draco;
