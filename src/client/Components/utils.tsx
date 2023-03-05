// utils.js

import React, { useState, useEffect, useRef } from 'react';
import { IProgress } from '../../server/domain/IProgress';

interface IUseInterval {
    (callback: () => void, interval: number): void;
  }
  
  export const useInterval: IUseInterval = (callback, interval) => {
    const savedCallback = useRef<(() => void) | null>(null);
    // After every render, save the latest callback into our ref.
    useEffect(() => {
      savedCallback.current = callback;
    });
  
    useEffect(() => {
      function tick() {
        if (savedCallback.current) {
        savedCallback.current();
        }
      }
  
      let id = setInterval(tick, interval);
      return () => clearInterval(id);
    }, [interval]);
  };


export const CustomComponents = {
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
export const getProgressString = (progress: IProgress) => {
        const out = "Task ID: " + progress.task_id + " | Round: " + (progress.completed_rounds +1) + "/" + progress.rounds + " | Subtasks: " + progress.completed_subtasks + "/" + progress.subtasks + (progress.first_pass ? " | A pass " : " | B pass ") + "<br/> DDState: " + progress.ddstate + " | Momentum: " + progress.momentum?.join(", ") + " | Output: " + progress.output?.join(", ");
        console.log(out);
    return out;
    };
