import {userInfo} from 'os';
import router from '../router';
import {Request, Response} from "express";
import {Progress} from "../../models";
import { IError } from '../../domain/IError';
import { IProgress } from '../../domain/IProgress';

router.route('/duiqueue')
    .get((req: Request, res: Response) => {
        console.log("DUIQUEUE GET")
        try{
        const {F, W, C, task_id, num_rounds} = req.query;
        // console.log(req.query)
        // console.log(F)
        // console.log(C)
        // console.log(task_id)

        // call python process
        const { spawn } = require('child_process');
        const py = spawn('/Users/yaatehr/miniconda3/envs/duiqueue/bin/python', ['/Users/yaatehr/Programs/duiqueue/src/duiqueue/main.py', F, W, C, task_id, num_rounds]);
        py.stdout.on('data', (data: { toString: () => any; }) => {
                console.log(data.toString());
                res.json(data.toString());
            });
        py.stderr.on('data', (data: any) => {
            console.log(data.toString());
        });
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
    });


router.route('/duiqueue/progress')
    .get(async (req: Request, res: Response) => {
        console.log("DUIQUEUE PROGRESS GET")
        try{
        //get the most recent progress object from mongodb
        const latestProgress = await Progress.find().sort({$natural:-1}).limit(1);
        res.json(latestProgress);
        res.status(200);

        } catch (e) {
            console.log(e);
        }
    })
    .post(async (req: Request, res: Response) => {
        console.log("DUIQUEUE PROGRESS POST")
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
