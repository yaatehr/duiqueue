import * as React from 'react';
import '../Less/app.less';
import {apiRoute} from '../utils';
import {AppProps, AppStates} from "../../server/domain/IApp";
import {ITest} from "../../server/domain/ITest";
import {Put, Post, Get, Delete} from "../Services";
import { IProgress } from '../../server/domain/IProgress';
import {useInterval} from './utils';

const CustomComponents = {
    TextComponent: (props: any) => {
        return (
            <div>
                <h1>{props.text}</h1>
            </div>
        )
    },
    PollingComponent: (props: any) => {
        useInterval(props.callback, 1000);
        return (
            <div>
                {props.progress && <p>{`Progress: ${getProgressString(props.progress)}`}</p>}
            </div>
        )
    }
    
}
const getProgressString = (progress: IProgress) => {
        const out = "Task ID: " + progress.task_id + " | Round: " + (progress.completed_rounds +1) + "/" + progress.rounds + " | Subtasks: " + progress.completed_subtasks + "/" + progress.subtasks + (progress.first_pass ? " | A pass " : " | B pass ") + "<br/> DDState: " + progress.ddstate + " | Momentum: " + progress.momentum?.join(", ") + " | Output: " + progress.output?.join(", ");
        console.log(out);
    return out;
    };
export default class App extends React.Component<AppProps, AppStates> {
    state: AppStates = {
        username: '',
        textOfPostTest: '',
        textForPost: '',
        textOfPutTest: '',
        textForPut: '',
        textOfDeleteTest: '',
        textForDelete: '',
        W: '0',
        F: '0',
        C: '0',
        task_id: '',
        num_rounds: '0',
        output: '',
        momentum: '',
        pending_queue_request: false,
    };

    testGet = async (): Promise<void> => {
        try {
            const res: { username: string } = await Get(apiRoute.getRoute('test'))
            this.setState({username: res.username});
        } catch (e) {
            this.setState({username: e.message});
        }
    }

    testGetDuiQueue = async (): Promise<void> => {
        try {
            this.setState({pending_queue_request: true});
            // const res: {}
            const {W, F, C, task_id, num_rounds} = this.state;
            // await Get(apiRoute.getRoute('duiqueue'), {W: '1', F: '1', C: '1', task_id: '1', num_rounds: '1'});
            const res: {output: string, momentum: string} = await Get(apiRoute.getRoute('duiqueue'), {W, F, C, task_id, num_rounds});
            this.setState({output: res.output, momentum: res.momentum, pending_queue_request: false});
        } catch (e) {
        }
    }

    testGetProgress = async (): Promise<void> => {
        try {
            console.log("testGetProgress")
            const res: IProgress[] = await Get(apiRoute.getRoute('duiqueue/progress'));
            console.log(res[0])
            if(res[0].task_id === this.state.task_id){
                this.setState({progress: res[0]}); 
            }
        } catch (e) {
        }
    }
    // startProgressPoll = async (): Promise<void> => {
    //     try {
    //         console.log("startProgressPoll")
    //         useInterval(this.testGetProgress, 1000);
    //     } catch (e) {
    //     }
    // }


    testPost = async (): Promise<void> => {
        const {textOfPostTest} = this.state;

        if (textOfPostTest.trim()) {
            try {
                const res: ITest = await Post(
                    apiRoute.getRoute('test'),
                    {text: textOfPostTest}
                );
                this.setState({
                    textForPost: res.text,
                    response: res,
                });
            } catch (e) {
                this.setState({textForPost: e.message});
            }
        }
    }

    testPut = async (): Promise<void> => {
        const {textOfPutTest, response} = this.state;
        if (response && textOfPutTest.trim()) {
            try {
                const res: ITest = await Put(
                    apiRoute.getRoute('test'),
                    {text: textOfPutTest, id: response?._id}
                    );
                this.setState({textForPut: res.text, response: res});
            } catch (e) {
                this.setState({textForPut: e.message});
            }
        } else {
            this.setState({
                textForPut: "You don't have any resource in database to change. first use post",
            })
        }
    }

    testDelete = async (): Promise<void> => {
        const {response} = this.state;
        if (response) {
            try {
                const res: ITest = await Delete(apiRoute.getRoute('test'), {id: response?._id});
                this.setState({textForDelete: `${res._id} ${res.text}`, response: undefined});
            } catch (e) {
                this.setState({textForDelete: e.message});
            }
        } else {
            this.setState({
                textForDelete: "You don't have any resource in database to delete. first use post"
            })
        }
    }
//call useInterval inside body of a function component
    render() {
        const {username, textForPost, textForPut, pending_queue_request, textForDelete, W, F, C, num_rounds, task_id, progress} = this.state;
        const inputText = "Input text...";
        return (
            <div>
                <div>
                    <div>
                        <div>
                            <button onClick={this.testGetDuiQueue}>{"Test DUIQUEUE"}</button>
                        </div>
                        <label>{"Duiqueue params: "}</label><div/>
                        <CustomComponents.TextComponent text="W: "/><input onChange={e => this.setState({W: e.target.value})} placeholder={W}/><div/>
                        <CustomComponents.TextComponent text="F: "/><input onChange={e => this.setState({F: e.target.value})} placeholder={F}/><div/>
                        <CustomComponents.TextComponent text="C: "/><input onChange={e => this.setState({C: e.target.value})} placeholder={C}/><div/>
                        <CustomComponents.TextComponent text="task id: "/><input onChange={e => this.setState({task_id: e.target.value})} placeholder={task_id}/><div/>
                        <CustomComponents.TextComponent text="Num Rounds: "/><input onChange={e => this.setState({num_rounds: e.target.value})} placeholder={num_rounds}/><div/>
                    </div>
                    <CustomComponents.TextComponent text={`Output: ${this.state.output}`}/>
                    <CustomComponents.TextComponent text={`Momentum: ${this.state.momentum}`}/>
                    {/* <button onClick={this.startProgressPoll}>{"start polling progress"}</button> */}
                    {
                        pending_queue_request &&  <CustomComponents.PollingComponent callback={this.testGetProgress} progress={progress} />
                    }
                    
                    <div>
                        <div>
                            <button onClick={this.testGetProgress}>{"Test Get Progress"}</button>
                        </div>
                        <label>{"Test for Get: "}</label>
                        <h2>{!!username && `Hello ${username}!`}</h2>
                    </div>
                    <div>
                        <div>
                            <button onClick={this.testGet}>{"Test Get"}</button>
                        </div>
                        <label>{"Test for Get: "}</label>
                        <h2>{!!username && `Hello ${username}!`}</h2>
                    </div>
                    <div>
                        <input onChange={e => this.setState({textOfPostTest: e.target.value})} placeholder={inputText}/>
                        <button onClick={this.testPost}>{"Test Post"}</button>
                    </div>
                    <div>
                        <label>{"Test for Post: "}</label>
                        <h3>{textForPost}</h3>
                    </div>
                    <div>
                        <input onChange={e => this.setState({textOfPutTest: e.target.value})} placeholder={inputText}/>
                        <button onClick={this.testPut}>{"Test Put"}</button>
                    </div>
                    <div>
                        <label>{"Test for Put: "}</label>
                        <h3>{textForPut}</h3>
                    </div>
                    <div>
                        <button onClick={this.testDelete}>{"Test Delete"}</button>
                    </div>
                    <div>
                        <label>{"Test for Delete: "}</label>
                        <h3>{textForDelete}</h3>
                    </div>
                </div>
            </div>
        );
    }
}
