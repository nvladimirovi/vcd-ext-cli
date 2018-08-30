import { EventEmitter } from "events";

export class Serial {
    private tasks: any[] = [];
    private tasksChange = new EventEmitter();
    private tasksResults: any[] = [];

    /**
     * Execute tasks one by one.
     * @param tasks array of tasks to be executed one after another.
     */
    public serial(tasks: any[]): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.tasks = tasks;
            this.next(null, null);

            this.tasksChange.on("done", (data) => {
                resolve(data);
            });

            this.tasksChange.on("error", (error) => {
                reject(error);
            });
        });
    }

    /**
     * Serial flow control contorller
     * @param error error which is passed by methods in the flow control.
     * @param result data which will be passed to the next method in flow control.
     */
    public next(error: Error, result: any): void {
        if (error) {
            this.tasksChange.emit("error", error);
            return;
        }

        const currentTask = this.tasks.shift();
        this.tasksResults.push(result);

        if (currentTask) {
            currentTask(result)
                .then((data: any) => {
                    this.next(null, data);
                })
                .catch((err: Error) => {
                    this.next(err, null);
                });
            return;
        }

        this.tasksChange.emit("done", this.tasksResults.slice(1, this.tasksResults.length));
    }
}