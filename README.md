# Draco-Vis

[![npm version](https://img.shields.io/npm/v/draco-vis.svg)](https://www.npmjs.com/package/draco-vis)
[![Build Status](https://travis-ci.com/uwdata/draco-vis.svg?branch=master)](https://travis-ci.com/uwdata/draco-vis)

A module for Draco on the web, written in Typescript. Learn more about Draco at https://uwdata.github.io/draco/. 

Note that we use [Emscripten](https://github.com/kripken/emscripten) to compile the Clingo constraint solver to WebAssembly so it runs inside your browser.

## Installation

Install with `yarn add draco-vis`. See it in action on Observable at https://beta.observablehq.com/@domoritz/hello-draco.

## API

Draco-Vis exports the [Draco-Core API](https://github.com/uwdata/draco/blob/master/README.md#draco-core-api-typescript--javascript). In addition, it exposes the `Draco` object.

*new* **Draco** *(updateStatus?: (text: string) => void, url?: string)*

>Constructs a `Draco` object. `updateStatus` is a callback used to log module status updates, defaulting to `console.log`. `url` may point to the base path of the hosting server, where '/clingo.js' from the package `wasmclingo` should rest, defaulting to the [unpkg url of `wasmclingo`](https://unpkg.com/wasm-clingo@0.2.2) (you may want to specify your own server if speed is of priority).

_draco._**init** *(): Promise*

>Initializes Draco's solver, returning a `Promise` that will resolve once initialization completes.

_draco._**solve** *(program: string, options?: Option): SolutionSet*

>Solves the given Draco ASP program. Returns a `SolutionSet` if satisfiable.

_draco._**prepareData** *(data: any[])*

>Ingests the given data (a list of dictionaries), automatically parsing it for fields and datatypes, as well as various statistics.

_draco._**getSchema** *(): Schema*

>Returns the data `Schema` of this (will be `null` if `prepareData` has not yet been called).

_draco._**updateAsp** *(aspSet: {\[s: string\]: string})*

>Updates the constraints / programs of this.

_draco._**getConstraintSet** *(): ConstraintSet*

>Returns the `ConstraintSet` backing this.

## Run locally

Run `yarn` to install dependencies. Then run `yarn start`.

Run `yarn test` to test the module.

Run `yarn format` to format the code.
