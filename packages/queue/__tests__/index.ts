import Queue from "../";

describe("@node-api-toolkit/queue", () => {
  let queue;
  let onEvent;
  let asyncFunc;

  beforeEach(() => {
    queue = new Queue();
    onEvent = jest.fn();

    asyncFunc = jest.fn().mockImplementation(
      () =>
        new Promise((res) => {
          setTimeout(() => res({ some: "data" }), 100);
        })
    );
  });

  describe("add", () => {
    it("adds the promise to the promise map", () => {
      const promise = queue.add(asyncFunc, { name: "async" });
      expect(queue.getPromiseName(promise)).toBe("async");
    });

    it("adds the async function to the queuedFuncs", () => {
      queue.add(asyncFunc, { name: "async" });

      queue.queuedFuncs[0]();
      expect(asyncFunc).toBeCalled();
    });

    it("returns a promise when it is called", () => {
      queue.add(asyncFunc, { name: "async" });

      queue.queuedFuncs[0]();
      expect(asyncFunc).toBeCalled();
    });

    it("it adds an item to queued without calling it", () => {
      queue.on("all", onEvent);
      const promise = queue.add(asyncFunc, { name: "async" });

      expect(onEvent).toHaveBeenCalledWith("queued", promise);
      expect(asyncFunc).not.toHaveBeenCalled();
    });

    it("adds a promise to the queue that is pending and returns that same promise", () => {
      const promise = queue.add(asyncFunc, { name: "async" });
      expect(promise).toBeTruthy();
      expect(queue.queuedPromises[0]).toEqual(promise);
    });

    it("resolves the wrapper promise", async () => {
      const promise = queue.add(asyncFunc, { name: "async" });
      expect(await promise).toEqual({ some: "data" });
    });

    it("rejects the promise wrapper if there is an error", async () => {
      const promise = queue.add(
        () =>
          new Promise((res, rej) => {
            setTimeout(() => {
              rej(new Error("bad"));
            }, 100);
          }),
        { name: "async" }
      );

      expect(promise).rejects.toEqual(new Error("bad"));
    });

    it.todo("does not start if this.autoStart is false");

    it("does not start if it is already started", () => {});
  });

  describe("getPromiseName", () => {
    it("gets promise name", () => {
      const promise = queue.add(asyncFunc, { name: "async" });
      expect(queue.getPromiseName(promise)).toEqual("async");
    });
  });

  describe("on", () => {
    it("queued", () => {
      const queued = jest.fn();
      queue.on("queued", queued);
      const promise = queue.add(asyncFunc, { name: "async" });

      expect(queued).toHaveBeenCalledWith("queued", promise);
    });
  });

  describe("tmpFile", () => {
    it.todo("should create a new tmp file if one is not specified");
    it.todo("should load an existing tmp file if one is specified");
    it.todo("should append to tmp file if one is specified");
  });

  it("should output debug information");

  it(
    "should not be stopped if a function is added in the end of a running function"
  );
});
