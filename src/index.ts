import Clingo from 'wasm-clingo';
import * as constraints from './constraints';
import { getModels, models2vl } from './spec';

export * from './constraints';

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

/**
 * Draco is a solver that recommends visualization specifications based off
 * partial specs.
 */
class Draco {
  public initialized = false;

  private Module: any;

  private stdout: string = '';

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
  public solve(program: string, options: Options = {}) {
    if (!this.initialized) {
      throw Error('Draco is not initialized. Call `init() first.`');
    }

    this.Module.setStatus('Running Draco Query...');

    const programs = options.constraints || Object.keys(constraints);

    program += programs.map((name: string) => (constraints as any)[name]).join('\n\n');

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
    const models = getModels(result);

    if (models.length > (options.models || 1)) {
      throw new Error('Too many models.');
    }

    const specs = models2vl(models);

    // done
    this.Module.setStatus('');

    return { specs, result, models, programs };
  }
}

export default Draco;
