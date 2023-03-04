import {Document} from "mongoose";

export interface IProgress extends Document{
    rounds: number;
    completed_rounds: number;
    subtasks: number;
    completed_subtasks: number;
    first_pass: boolean;
    task_id: string;
    ddstate: string;
    momentum: number[];
    output: number[];
}
