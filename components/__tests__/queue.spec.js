const Queue = require('../queue');

describe('Queue', () => {
  let queue;
  let onEvent;
  let asyncFunc;

  beforeEach(() => {
    queue = new Queue();
    onEvent = jest.fn();

    asyncFunc = jest.fn().mockImplementation(() => new Promise((res) => {
      setTimeout(() => res({ some: 'data' }), 100);
    }));
  });

  describe('add', () => {
    it('adds the promise to the promise map', () => {
      const promise = queue.add(asyncFunc, { name: 'async' });
      expect(queue.promiseNameMap.find(([, p]) => p === promise)[0])
        .toBe('async');
    });

    it('adds the async function to the queuedFuncs', () => {
      queue.add(asyncFunc, { name: 'async' });

      queue.queuedFuncs[0]();
      expect(asyncFunc).toBeCalled();
    });

    it('returns a promise when it is called', () => {
      queue.add(asyncFunc, { name: 'async' });

      queue.queuedFuncs[0]();
      expect(asyncFunc).toBeCalled();
    });

    it('it adds an item to queued without calling it', () => {
      queue.on('all', onEvent);
      const promise = queue.add(asyncFunc, { name: 'async' });

      expect(onEvent).toHaveBeenCalledWith('queued', promise);
      expect(asyncFunc).not.toHaveBeenCalled();
    });

    it('adds a promise to the queue that is pending and returns that same promise', () => {
      const promise = queue.add(asyncFunc, { name: 'async' });
      expect(promise).toBeTruthy();
      expect(queue.queued[0]).toEqual(promise);
    });

    it('resolves the wrapper promise', async () => {
      const promise = queue.add(asyncFunc, { name: 'async' });
      expect(await promise).toEqual({ some: 'data' });
    });

    it('rejects the promise wrapper if there is an error', async () => {
      const promise = queue.add(() => (
        new Promise((res, rej) => {
          setTimeout(() => { rej(new Error({ error: 'bad' })); }, 100);
        })
      ), { name: 'async' });

      expect(promise).rejects.toEqual(new Error({ error: 'bad' }));
    });

    it('does not start if this.autoStart is false', () => {

    });

    it('does not start if it is already started', () => {

    });
  });

  test('getPromiseName', () => {
    const promise = queue.add(asyncFunc, { name: 'async' });
    expect(queue.getPromiseName(promise)).toEqual('async');
  });

  describe('on', () => {
    test('queued', () => {
      const queued = jest.fn();
      queue.on('queued', queued);
      const promise = queue.add(asyncFunc, { name: 'async' });

      expect(queued).toHaveBeenCalledWith(promise);
    });
  });
});
