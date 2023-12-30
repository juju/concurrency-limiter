/** Copyright (C) 2018 Canonical Ltd.

  This library provides the ability to limit the number of asynchronous
  concurrent tasks running.
*/
declare module 'concurrency-limiter' {
  /**
    The concurrency limiter.

    It is instantiated providing the maximum number of async tasks that are
    allowed to run concurrently.
  */
  export default class Limiter {
    constructor(limit: number);

    private _limit: number;
    private _length: number;
    private _queue: (() => void)[];

    /**
    Request a slot for concurrent execution. The returned promise is only
    resolved when a slot becomes available. The promise is never rejected.
    This method is usually called before starting an async operation, like:

    await limiter.enter();
    await wsConnect();
    ...
    wsClose();
    limiter.exit();

    @returns A promise resolved when a slot is available.
    */
    enter(): Promise<void>;

    /**
    Release a slot for concurrent execution. This method is usually called
    after an async operation completes.
    */
    exit(): void;

    /**
    Execute the provided async function when a concurrent slot is available,
    and release the slot when the function completes, returning its result.
    The limiter is exited even in the case the function raises an exception.

    @param func A function to be awaited when an async slot is available.
    @returns The result returned by awaiting the provided function.
    */
    run<T>(func: () => T): Promise<T>;
  }
}
