import { asp2vl, Constraint } from 'draco-core';
import { TopLevelFacetedUnitSpec } from 'vega-lite/build/src/spec';
import { Model } from './draco';

const SOFT_REGEX = /(soft\(\w+).*?\)/;

/**
 * Get the array of witnesses from clingo output.
 * Return undefined if no witnesses were found.
 */
export function getModels(result: any, constraints: Constraint[]): Model[] {
  return (result.Call || []).reduce((arr: any[], el: any) => {
    el.Witnesses
      .forEach((d: any) => {
        const facts = d.Value;
        const costs = d.Costs;

        const violationAsps =
          facts
            .filter((fact: string) => {
              return fact.startsWith('soft(');
            });

        const violations =
          violationAsps
            .map((asp: string) => {
              const matcher = SOFT_REGEX.exec(asp);

              if (!matcher) {
                throw Error(`invalid violation: ${asp}`);
              }
              const toMatch = matcher[1];

              const constraint =
                constraints.find((curr: Constraint) => {
                  return curr.asp.startsWith(toMatch);
                });

              if (!constraint) {
                throw Error(`${toMatch} not found!`);
              }

              return {
                ...constraint,
                witness: asp
              };
            });

        arr.push({
          costs,
          facts,
          violations
        })
      });
    return arr;
  }, []);
}

export function models2vl(models: Model[]): TopLevelFacetedUnitSpec[] {
  return models.map(model => asp2vl(model.facts));
}