import {ITest} from "./ITest";
import {IProgress} from "./IProgress";
export interface AppStates {
    username?: string;
    textOfPostTest: string,
    textForPost: string,
    textOfPutTest: string,
    textForPut: string,
    textOfDeleteTest: string,
    textForDelete: string,
    response?: ITest,
    progress?: IProgress,
    W: string,
    F: string,
    C: string,
    task_id: string,
    num_rounds: string,
    output: string,
    momentum: string,
    pending_queue_request: boolean,
}

export interface AppProps {}
