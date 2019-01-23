import { asp2vl } from 'draco-core';
import { TopLevelFacetedUnitSpec } from 'vega-lite/build/src/spec';
import { Model } from './draco';

/**
 * Get the array of witnesses from clingo output.
 * Return undefined if no witnesses were found.
 */
export function getModels(result: any): Model[] {
  return (result.Call || []).reduce((arr: any[], el: any) => {
    el.Witnesses.forEach((d: any) =>
      arr.push({
        facts: d.Value,
        costs: d.Costs,
      })
    );
    return arr;
  }, []);
}

export function models2vl(models: Model[]): TopLevelFacetedUnitSpec[] {
  return models.map(model => asp2vl(model.facts));
}
