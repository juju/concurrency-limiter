/* Copyright (C) 2018 Francesco Banconi */

/**
  This library provides the ability to limit the number of asynchronous
  concurrent tasks running.
*/

'use strict';


/**
  The concurrency limiter.

  It is instantiated providing the maximum number of async tasks that are
  allowed to run concurrently.
*/
class Limiter {
  constructor(limit) {
    if (limit < 1) {
      throw new Error('cannot create limiter: provided limit must be > 0');
    }
    this._limit = limit;
    this._length = 0;
    this._queue = [];

    this.enter = this.enter.bind(this);
    this.exit = this.exit.bind(this);
    this.run = this.run.bind(this);
  }

  /**
    Request a slot for concurrent execution. The returned promise is only
    resolved when a slot becomes available. The promise is never rejected.
    This method is usually called before starting an async operation, like:

      await limiter.enter();
      await wsConnect();
      ...
      wsLogout();
      limiter.exit();

    @returns {Promise} A promise resolved when a slot is available.
  */
  enter() {
    return new Promise((resolve, _) => {
      const handler = () => {
        this._length++;
        resolve();
      };
      if (this._length < this._limit) {
        handler();
        return;
      }
      this._queue.push(handler);
    });
  }

  /**
    Release a slot for concurrent execution. This method is usually called
    after an async operation completes.
  */
  exit() {
    if (!this._length) {
      throw new Error(
        'cannot exit limited concurrency: all slots are available already');
    }
    this._length--;
    if (!this._queue.length) {
      return;
    }
    const handler = this._queue.shift();
    handler();
  }

  /**
    Execute the provided async function when a concurrent slot is available,
    and release the slot when the function completes, returning its result.
    The limiter is exited even in the case the function raises an exception.

    @param {Function} func A function to be awaited when an async slot is
      available.
    @returns {Any} The result returned by awaiting the provided function.
  */
  async run(func) {
    await this.enter();
    try {
      return await func();
    } finally {
      this.exit();
    }
  }
}


module.exports = Limiter;
