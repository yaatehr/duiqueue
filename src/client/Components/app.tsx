import * as React from 'react';
import '../Less/app.less';
import {apiRoute} from '../utils';
import {AppProps, AppStates} from "../../server/domain/IApp";
import {Get} from "../Services";
import { IProgress } from '../../server/domain/IProgress';
import {CustomComponents} from './utils';

export default class App extends React.Component<AppProps, AppStates> {
    state: AppStates = {
        W: '0',
        F: '0',
        C: '0',
        task_id: '',
        num_rounds: '0',
        output: '',
        momentum: '',
        pending_queue_request: false,
    };

    getDuiQueue = async (): Promise<void> => {
        try {
            this.setState({pending_queue_request: true});
            const {W, F, C, task_id, num_rounds} = this.state;
            // await Get(apiRoute.getRoute('duiqueue'), {W: '1', F: '1', C: '1', task_id: '1', num_rounds: '1'});
            const res: {output: string, momentum: string} = await Get(apiRoute.getRoute('duiqueue'), {W, F, C, task_id, num_rounds});
            this.setState({output: res.output, momentum: res.momentum, pending_queue_request: false});
        } catch (e) {
            console.log(e);
        }
    }

    getProgress = async (): Promise<void> => {
        try {
            // console.log("getProgress")
            const res: IProgress[] = await Get(apiRoute.getRoute('duiqueue/progress'));
            // console.log(res[0])
            if(res[0].task_id === this.state.task_id){
                this.setState({progress: res[0]}); 
            }
        } catch (e) {
            console.log(e);
        }
    }

    render() {
        const {pending_queue_request, W, F, C, num_rounds, task_id, progress} = this.state;
        return (
                <div>
                    <div>
                        <div>
                            <button onClick={this.getDuiQueue}>{"Test Queue"}</button>
                        </div>
                        <CustomComponents.TextComponent text="W: "/><input onChange={e => this.setState({W: e.target.value})} placeholder={W}/><div/>
                        <CustomComponents.TextComponent text="F: "/><input onChange={e => this.setState({F: e.target.value})} placeholder={F}/><div/>
                        <CustomComponents.TextComponent text="C: "/><input onChange={e => this.setState({C: e.target.value})} placeholder={C}/><div/>
                        <CustomComponents.TextComponent text="task id: "/><input onChange={e => this.setState({task_id: e.target.value})} placeholder={task_id}/><div/>
                        <CustomComponents.TextComponent text="Num Rounds: "/><input onChange={e => this.setState({num_rounds: e.target.value})} placeholder={num_rounds}/><div/>
                    </div>
                    <CustomComponents.TextComponent text={`Output: ${this.state.output}`}/>
                    <CustomComponents.TextComponent text={`Momentum: ${this.state.momentum}`}/>
                    {
                        pending_queue_request &&  <CustomComponents.PollingComponent callback={this.getProgress} progress={progress} />
                    }
                    
                    <div>
                        <div>
                            <button onClick={this.getProgress}>{"Test Get Progress"}</button>
                        </div>
                    </div>
                </div>
        );
    }
}
