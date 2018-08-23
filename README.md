[![Build Status](https://travis-ci.org/frankban/concurrency-limiter.svg?branch=master)](https://travis-ci.org/frankban/concurrency-limiter)

# concurrency-limiter

Limit the number of asynchronous concurrent tasks running.

## Goals

Assume you need to connect to many different WebSocket servers, or retrieve
many resources concurrently at the same time. Any asynchronous operation can be
started easily with JavaScript, but when too many of them could potentially be
executed at the same time it's usually a good idea to limit their number in
order to avoid resource consumption on the browser or the node instance.

Limiting the number of concurrent asynchronous tasks running is exactly the
goal of concurrency-limiter.

## Getting started

Instantiate a limiter passing the number of allowed concurrent tasks:
```javascript
const Limiter = require('concurrency-limiter');

const limiter = new Limiter(10);
```
The limiter created in the code above allows 10 concurrent tasks to be executed
together. Awaiting `limiter.enter()` ensures that subsequent code is only
executed when a slot becomes available. The promise returned by `enter()` is
only resolved when less than 10 tasks are running. When a task is complete,
the slot can be released by calling `limiter.exit()`, like in this example:
```javascript
async function run() {
    await limiter.enter(); // This will "block" until a slot is available.
    await myAsyncTask();
    limiter.exit(); // This releases the slot.
}
```
The code above ensures that only 10 calls to myAsyncTask() are executed
concurrently. Any additional calls will have to wait for a slot to be
available. Note that there is no limit to what can be executed between
`enter()` and `exit()`.

It's very important to ensure that, for every `enter()` call, the corresponding
`exit()` one is also eventually executed, otherwise an acquired slot would
never be released. For that reason, the example above should be more correctly
written as:
```javascript
async function run() {
    await limiter.enter();
    try {
        await myAsyncTask();
    } finally {
        limiter.exit();
    }
}
```
In the simple case a single async function must be executed in limited
concurrency, when entering the limiter must be done right before the function
is called and exiting right after, `limiter.run()` can be used instead.
The above can be rewritten as:
```javascript
async function run() {
    await limiter.run(myAsyncTask);
}
```
The `run()` method will release the slot even in the case myAsyncTask raises an
exception. Also, the awaited result of myAsyncTask is returned.

## API reference

### Limiter(limit) ⇒ `Object`

The concurrency limiter.

It is instantiated providing the maximum number of async tasks that are allowed
to run concurrently.
It has the following methods:

#### enter() ⇒ `Promise`

Request a slot for concurrent execution. The returned promise is only resolved
when a slot becomes available. The promise is never rejected.
This method is usually called before starting an async operation, like:
```javascript
    await limiter.enter();
    await wsConnect();
    ...
    wsClose();
    limiter.exit();
```

*@returns {Promise}* A promise resolved when a slot is available.

#### exit()

Release a slot for concurrent execution. This method is usually called after an
async operation completes.

#### run(func) ⇒ `Promise`

Execute the provided async function when a concurrent slot is available, and
release the slot when the function completes, returning its result.
The limiter is exited even in the case the function raises an exception.

*@param {Function} func* A function to be awaited when an async slot is
    available.
*@returns {Any}* The result returned by awaiting the provided function.
