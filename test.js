/* Copyright (C) 2018 Francesco Banconi */

'use strict';

const tap = require('tap');

const Limiter = require('./limiter.js');


/**
  The concurrency recorder is used to record current and maximum concurrency
  in tests.
*/
class ConcurrencyRecorder {
  constructor() {
    this.current = 0;
    this.max = 0;
    this.run = this.run.bind(this);
  }

  run() {
    this.current++;
    if (this.current > this.max) {
      this.max = this.current;
    }
    return new Promise((resolve, _) => {
      setTimeout(() => {
        this.current--;
        resolve();
      }, 10);
    });
  }
}


/**
  For the given number of times, enter the given limiter, run the given task
  and then exit the limiter. The provided callback is called when all tasks
  have been run.
*/
function enterMany(limiter, task, num, callback) {
  const promises = [];
  for (let i = 0; i < num; i++) {
    const promise = limiter.enter().then(task).then(async () => {
      limiter.exit();
    });
    promises.push(promise);
  }
  Promise.all(promises).then(callback);
}


/**
  For the given number of times, use the given limiter to run the given task.
  The provided callback is called when all tasks have been run.
*/
function runMany(limiter, task, num, callback) {
  const promises = [];
  for (let i = 0; i < num; i++) {
    const promise = limiter.run(task);
    promises.push(promise);
  }
  Promise.all(promises).then(callback);
}


tap.test('limiter', t => {

  t.test('invalid limit', t => {
    t.throw(() => new Limiter(0));
    t.end();
  });

  t.test('multiple unlimited tasks', t => {
    const limiter = new Limiter(10);
    const cr = new ConcurrencyRecorder();
    enterMany(limiter, cr.run, 10, () => {
      t.equal(cr.current, 0, 'current');
      t.equal(cr.max, 10, 'max');
      t.end();
    });
  });

  t.test('multiple limited tasks', t => {
    const limiter = new Limiter(5);
    const cr = new ConcurrencyRecorder();
    enterMany(limiter, cr.run, 20, () => {
      t.equal(cr.current, 0, 'current');
      t.equal(cr.max, 5, 'max');
      t.end();
    });
  });

  t.test('one single slot', t => {
    const limiter = new Limiter(1);
    const cr = new ConcurrencyRecorder();
    enterMany(limiter, cr.run, 10, () => {
      t.equal(cr.current, 0, 'current');
      t.equal(cr.max, 1, 'max');
      t.end();
    });
  });

  t.test('too many exits', t => {
    const limiter = new Limiter(10);
    t.throws(limiter.exit);
    t.end();
  });

  t.test('run unlimited', t => {
    const limiter = new Limiter(10);
    const cr = new ConcurrencyRecorder();
    runMany(limiter, cr.run, 8, () => {
      t.equal(cr.current, 0, 'current');
      t.equal(cr.max, 8, 'max');
      t.end();
    });
  });

  t.test('run limited', t => {
    const limiter = new Limiter(1);
    const cr = new ConcurrencyRecorder();
    runMany(limiter, cr.run, 5, () => {
      t.equal(cr.current, 0, 'current');
      t.equal(cr.max, 1, 'max');
      t.end();
    });
  });

  t.test('run with exceptions', t => {
    const limiter = new Limiter(10);
    const task = () => {
      throw new Error('bad wolf');
    };
    limiter.run(task).catch(err => {
      t.equal(err.message, 'bad wolf');
      // Check internal attrs of the limiter, to make sure all slots are
      // available even if the task raised an error.
      t.equal(limiter._length, 0, 'internal length');
      t.deepEqual(limiter._queue, [], 'internal queue');
      t.end();
    });
  });

  t.end();
});
