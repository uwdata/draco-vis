import Draco from '../src';

const EXAMPLE = `
% ====== Data definitions ======
data("data/cars.json").
num_rows(142).

fieldtype(horsepower,number).
cardinality(horsepower,94).

fieldtype(acceleration,number).
cardinality(acceleration,96).

% ====== Query constraints ======
encoding(e0).
:- not field(e0,acceleration).

encoding(e1).
:- not field(e1,horsepower).
`;

// const url = 'http://localhost:8000/';
const url = 'https://unpkg.com/wasm-clingo@0.2.2';

const draco = new Draco(url);
draco.init().then(() => {
  const solution = draco.solve(EXAMPLE, { models: 5 });
  console.log(solution);
});
