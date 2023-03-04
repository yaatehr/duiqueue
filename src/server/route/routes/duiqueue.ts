import {userInfo} from 'os';
import router from '../router';
import {Request, Response} from "express";
import {Progress} from "../../models";
import { IError } from '../../domain/IError';
import { IProgress } from '../../domain/IProgress';

router.route('/duiqueue')
    .get((req: Request, res: Response) => {
        // surround this code in a try catch block
        console.log("DUIQUEUE GET")
        try{
        //get fields F, W, C, and task_id from request
        const {F, W, C, task_id, num_rounds} = req.query;
        console.log(req.query)
        console.log(F)
        console.log(C)
        console.log(task_id)


        // call a python process to do the work
        const { spawn } = require('child_process');
        const py = spawn('/Users/yaatehr/miniconda3/envs/duiqueue/bin/python', ['/Users/yaatehr/Programs/duiqueue/src/duiqueue/main.py', F, W, C, task_id, num_rounds]);
        py.stdout.on('data', (data: { toString: () => any; }) => {
                console.log(data.toString());
                // console.log(data);
                res.json(data.toString());
                // res.send(data.toString());
            });
        py.stderr.on('data', (data: any) => {
            console.log(data.toString());
        });
        // py.strerr.on('end', function(){
        //     console.log('error function end');
        // });
        py.stdout.on('end', function(){
            console.log('python process stdout function end');
        });

        } catch (e) {
            const error: IError = {
                status: 500,
                message: "error calling process: " + (e as Error).message,
            }
            console.error(e);
            res.status(error.status).json({error});
        }
// load input from 
// https://www.cluzters.ai/forums/topic/616/how-to-call-a-python-function-from-node-js?c=1597
    });
router.route('/duiqueue/progress')
    .get(async (req: Request, res: Response) => {
        console.log("DUIQUEUE PROGRESS GET")
        try{
        const latestProgress = await Progress.find().sort({$natural:-1}).limit(1);
        //get the most recent progress object from mongodb
        // console.log(latestProgress);
        res.json(latestProgress);
        res.status(200);
        // res.send();

        } catch (e) {
            // const error: IError = {
            //     status: 500,
            //     message: "error getting prog: " + (e as Error).message,
            // }
            console.log(e);
            // res.status(error.status).json({message: error.message});
        }


    })
    .post(async (req: Request, res: Response) => {
        console.log("DUIQUEUE PROGRESS POST")
        console.log("GOT AN UPDATE")
        const {rounds, completed_rounds, subtasks, completed_subtasks, first_pass, task_id, ddstate, momentum, output} = req.body;

        const Prog: IProgress = new Progress({rounds, completed_rounds, subtasks, completed_subtasks, first_pass, task_id, ddstate, momentum, output});

        try {
            const savedProgress: IProgress = await Prog.save();
            res.status(201).json(savedProgress);
        } catch (e) {
            const error: IError = {
                status: 500,
                message: "error saving progress: " + (e as Error).message, 
            }
            console.error(e);
            res.status(error.status).json({message: "error saving progress"});
        }
    });

export default router;
