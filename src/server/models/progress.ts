import {IProgress} from "../domain/IProgress";
import Database from '../dbConfigs';
import {Schema} from "mongoose";

const {mongo: {model}} = Database;

const ProgressSchema: Schema<IProgress> = new Schema<IProgress>({
    rounds: {type: Number, required: true},
    completed_rounds: {type: Number, required: true},
    subtasks: {type: Number, required: true},
    completed_subtasks: {type: Number, required: true},
    first_pass: {type: Boolean, required: true},
    task_id: {type: String, required: true},
    ddstate: {type: String, required: true},
    momentum: {type: Array, required: false},
    output: {type: Array, required: false}
});
ProgressSchema.method("progressString", function() {
    const out = "Task ID: " + this.task_id + " | Round: " + this.completed_rounds +1 + "/" + this.rounds + " | Subtasks: " + this.completed_subtasks + "/" + this.subtasks + this.first_pass ? " | A pass " : " | B pass " + "\n DDState: " + this.ddstate + " | Momentum: " + this.momentum.join(", ") + " | Output: " + this.output.join(", ");
    console.log(out);
return out;
});

const m = model<IProgress>('Progress',ProgressSchema);
export default m;

