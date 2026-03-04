// Prevent Monaco from loading heavy default workers

self.MonacoEnvironment = {
  getWorker(_: any, label: string) {
    // For our custom language, return a simple worker
    return new Worker(
      URL.createObjectURL(
        new Blob(["self.onmessage = () => {}"], { type: "text/javascript" })
      )
    );
  },
};