
#!/usr/bin/env python3

import shutil
import argparse
from enum import Enum
import os
from time import sleep
import uuid
#COLAB
import sys
import numpy as np
from multiprocessing import Process, Manager, freeze_support
import requests
import json

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DEBUG_MODE = False
DEFAULT_SLEEP_SECONDS= 2
sys.path.append(os.path.dirname(ROOT_DIR))


# from .utils import ROOT_DIR, DEBUG_MODE, DEFAULT_SLEEP_SECONDS




class TaskState(Enum):
    NOT_STARTED = 0
    IN_PROGRESS = 1
    COMPLETE = 2
    FAILED = 3

#create an http request to the server
def submit_request_to_server(url, data, request_type="POST", headers=None):
    """
    submit a request to the server
    """
    response = None
    if request_type == "POST":
        # print(data)
        # print(json.dumps(data))
        response = requests.post(url, json=data, headers=headers)
    elif request_type == "GET":
        response = requests.get(url, data=json.dumps(data), headers=headers)
    return response


#submit http post request to http://localhost:3000/api/duiqueue
# read response from server
# log response code using log_and_update
# submit http post request to http://localhost:3000/api/duiqueue


def create_mapreduce_inputs(conf, round_num):
    for i in range(conf.F):
        builder_string = ",".join([str(x) for x in np.random.randint(100,size=conf.C).tolist()])
        if DEBUG_MODE:
            print("builder string")
            print(builder_string)
        append_to_file(os.path.join(conf.input_directory, f"{round_num}_{i}.txt"), builder_string)


def append_to_file(filepath, builder_string, directory_lock=None):
    """
    create a new file and write, or append to the end of existing file
    nonnull lock makes this threadsafe
    """
    if directory_lock is not None:
        directory_lock.acquire()

    try:
        if not os.path.exists(filepath):
            if not os.path.exists(os.path.dirname(filepath)):
                os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'a') as fp:
            fp.write(builder_string)
            fp.flush()
            fp.close()

    except Exception as ex:
        print("FAILURE IN APPEND_TO_WRITE")
        print(ex)
        pass

    if directory_lock is not None:
        directory_lock.release()

def read_from_file(filepath):
    """
    read from file (threadsafe)
    return list of string 
    """
    output = []
    with open(filepath, 'r') as fp:
        output = fp.readlines()
        fp.close()
    return output

def a_input_parser(dirname, subtask_id):
    filename = os.path.join(dirname, f"{subtask_id}.txt")
    line_list = read_from_file(filename)
    if DEBUG_MODE:
        print(line_list)
    nums = [line.split(",") for line in line_list]
    #flatten nums
    nums = [float(x) for sublist in nums for x in sublist]
    return nums

def b_input_parser(dirname, subtask_id):
    filename = os.path.join(dirname, f"apass_{subtask_id}.txt")
    line_list = read_from_file(filename)
    if DEBUG_MODE:
        print(line_list)
    nums = [line.split(",") for line in line_list]
    #flatten nums and convert to float
    nums = [float(x) for sublist in nums for x in sublist if x != ""]
    return nums

def a_post_process(dirname, subtask_id, nums, lock):
    round, task = [int(x) for x in subtask_id.split("_")]

    [append_to_file(os.path.join(dirname, f"apass_{round}_{i}.txt"), f"{n},", directory_lock=lock) for i, n in enumerate(nums)]
    return None

def b_post_process(dirname, subtask_id, nums, lock):
    return np.average(nums)

def compute_fed_adagrad(vec, F, m=0, beta=0.5, tau=10e-3, v=10e-3):
    vec /= F
    m = beta * m + (1 - beta) * vec
    v = v + np.power(vec, 2)
    return m / (np.sqrt(v) + tau), m, v


class MapReduceTaskConfig:
    def __init__(self, W, F, C, num_rounds = 1, root_directory=ROOT_DIR, max_subtasks_per_worker=5, task_id = None):

        self.F = F
        self.W = W
        self.C = C
        self.num_rounds =  num_rounds
        self.task_id = task_id or uuid.uuid4()
        self.root_directory = os.path.join(root_directory, "tasks", self.task_id)
        self.clear_task_root_directory()
        self.input_directory = os.path.join(self.root_directory, "inputs")
        self.max_subtasks_per_worker = max_subtasks_per_worker
        self.first_pass = True
        #momentum vals
        self.output_vector = np.zeros(self.C)
        self.momentum_vector = np.zeros(self.C)
        self.beta = 0.5
        self.tau = 10e-3
        self.v = 10e-3

    def clear_task_root_directory(self):
        #delete all files and subdirectories at a given path
        shutil.rmtree(self.root_directory, ignore_errors=True)

    def create_subtask_list(self, round_num):
        task_list = [(f"{round_num}_{task_id}", a_input_parser if self.first_pass else b_input_parser, a_post_process if self.first_pass else b_post_process, self.first_pass) for task_id in range(self.F if self.first_pass else self.C)]
        return task_list



class StateMachineBase(Process):
    def __init__(self, task_config, state_machine_id, sleep_time=DEFAULT_SLEEP_SECONDS):
        super().__init__()
        self.state = TaskState.NOT_STARTED
        self.log_directory = os.path.join(task_config.root_directory, "worker_logs")
        self.state_machine_id = state_machine_id
        self.task_config = task_config
        self.sleep_time = sleep_time
        self.log_interval = 2

    def log_and_update(self, state, extra=""):
        #update
        self.state = state
        #log
        if DEBUG_MODE:
            print(self.state_machine_id)
            print(self.state)
            print(self.log_directory)
            print(self.task_config.first_pass)
            print(extra)

        append_to_file(f"{self.log_directory}/{self.state_machine_id}.txt", f"machine: {self.state_machine_id}, state - {state}, is_first_pass - {self.task_config.first_pass}, extra: {extra}\n")

    def run(self):
        self.start_loop()

    def start_loop(self):
        raise NotImplementedError()
    

class DesignatedDriver(StateMachineBase):
    def __init__(self, task_config, manager):
        super().__init__(task_config, "DesignatedDriver")
        self.task_config = task_config
        self.log_and_update(TaskState.NOT_STARTED)
        self.manager = manager
        # self.manager.start()
        self.queue = self.manager.Queue()
        self.subtask_state_dict = self.manager.dict()
        self.output_dict =self.manager.dict()
        self.filesystem_lock = self.manager.Lock()
        self.workers = None

        self.spawn_workers(task_config)
        self.log_and_update(TaskState.IN_PROGRESS, "finish __init__, starting main loop")
        # self.start_loop()

    def submit_progress_update_to_server(self, round_no):
        rounds = self.task_config.num_rounds
        completed_rounds = round_no
        subtasks = self.task_config.F if self.task_config.first_pass else self.task_config.C
        completed_subtasks = sum([1 for k,v in self.subtask_state_dict.items() if v])
        # create a json object with the fields above    
        progress = {
            "task_id": self.task_config.task_id,
            "rounds": rounds,
            "completed_rounds": completed_rounds,
            "subtasks": subtasks,
            "completed_subtasks": completed_subtasks,
            "first_pass": self.task_config.first_pass,
            "task_id": self.task_config.task_id,
            "ddstate": self.state.name,
            "momentum": np.round(self.task_config.momentum_vector,2).tolist(),
            "output": np.round(self.task_config.output_vector,2).tolist(),
        }
        # send a post request to the server with the json object as the body
        submit_request_to_server("http://localhost:3000/api/duiqueue/progress", progress)


        

    def spawn_workers(self, task_config):
        self.workers = [BackseatDriver(task_config, w, self.queue, self.subtask_state_dict, self.output_dict, self.filesystem_lock) for w in range(task_config.W)]
        return self.workers

    def subtask_loop(self, task_list, round_no):
        incomplete = True
        log_counter = 0
        while incomplete:
            if log_counter % self.log_interval*3 == 0:
                self.log_and_update(TaskState.IN_PROGRESS, f"{'A' if self.task_config.first_pass else 'B'} Subtask status: {self.subtask_state_dict.values()}")
                for i,t in enumerate(task_list):
                    if not self.subtask_state_dict[t[0]]:
                        self.queue.put(t)
                    self.log_and_update(TaskState.IN_PROGRESS, f"replinishing job for {t[0]}")
                self.submit_progress_update_to_server(round_no)
                
            if DEBUG_MODE:
                print(self.subtask_state_dict.values())
            incomplete = not all(self.subtask_state_dict.values())
            sleep(self.sleep_time)
            log_counter +=1
        
        self.log_and_update(TaskState.IN_PROGRESS, f"{'A' if self.task_config.first_pass else 'B'} subtasks complete")
            

    def start_loop(self):
        try:
            for round in range(self.task_config.num_rounds):
                if DEBUG_MODE:
                    print("ROUND: ", round)
                self.task_config.first_pass = True
                create_mapreduce_inputs(self.task_config, round)
                task_list = self.task_config.create_subtask_list(round)
                for t in task_list:
                    self.subtask_state_dict[t[0]] = False
                    self.queue.put(t)

                self.log_and_update(TaskState.IN_PROGRESS, f"{len(task_list)} A subtasks added to list")
                #start A wait loop
                self.subtask_loop(task_list, round)

                #setup stage B
                self.task_config.first_pass = False
                # self.subtask_state_dict = self.manager.dict()
                self.subtask_state_dict.clear()

                task_list = self.task_config.create_subtask_list(round)
                for t in task_list:
                    self.subtask_state_dict[t[0]] = False
                    self.queue.put(t)
                
                self.log_and_update(TaskState.IN_PROGRESS, f"{len(task_list)} B subtasks added to list")
                self.subtask_loop(task_list, round)

                self.log_and_update(TaskState.IN_PROGRESS, f"output from task B :{self.output_dict}")
                
                # get items from self.output_dict, sort by key, and convert values to a numpy array
                output = np.array([self.output_dict[i] for i in sorted(self.output_dict.keys())]) - self.task_config.output_vector

                #momentum
                self.task_config.output_vector, self.task_config.momentum_vector, self.task_config.v = compute_fed_adagrad(output, self.task_config.F,  self.task_config.momentum_vector, self.task_config.beta, self.task_config.tau, self.task_config.v)
                if DEBUG_MODE:
                    print("OUTPUT WITH MOMENTUM: ")
                    print(self.task_config.momentum_vector)
                self.submit_progress_update_to_server(round)
                #Clear for next round
                self.subtask_state_dict.clear()
                self.output_dict.clear()

        except Exception as ex:
            self.log_and_update(TaskState.FAILED, f"{ex}")
            print(ex.with_traceback())

        self.log_and_update(TaskState.FAILED, f"DONE")
        # poison pill the workers
        for w in range(self.task_config.W):
            self.queue.put(("KILL", None, None))

        [w.join() for w in self.workers]
        # self.close()


class BackseatDriver(StateMachineBase):
    def __init__(self, task_config, id, queue, subtask_state_dict, output_dict, filesystem_lock):
        super().__init__(task_config, f"BackseatDriver{id}")
        self.task_config = task_config
        self.queue = queue
        self.subtask_state_dict = subtask_state_dict
        self.output_dict = output_dict
        self.filesystem_lock = filesystem_lock
        self.subtasks = []
        self.terminating = False
        self.log_and_update(TaskState.NOT_STARTED)
        # self.main_loop()

    def read_from_queue(self):
        while not self.queue.empty() and len(self.subtasks) < self.task_config.max_subtasks_per_worker:
            task = None
            try:
                task = self.queue.get()
            except Exception as ex:
                print(ex)
            if task:
                if task[0] == "KILL":
                    self.terminating = True
                    self.log_and_update(TaskState.FAILED, f"BackseatDriver is Exiting")
                    return
                self.subtasks.append(task)
        if len(self.subtasks)>0:
            self.log_and_update(TaskState.IN_PROGRESS, f"{len(self.subtasks)} B subtasks added to list")

    def process_subtasks(self):
        while len(self.subtasks) > 0:
            (subtask_id, input_parser, post_processor, first_pass) = self.subtasks.pop(0)
            if subtask_id in self.subtask_state_dict and not self.subtask_state_dict[subtask_id]:
                nums = input_parser(self.task_config.input_directory, subtask_id)
                output = post_processor(self.task_config.input_directory, subtask_id, nums, self.filesystem_lock if first_pass else None)
                self.subtask_state_dict[subtask_id] = True
                self.log_and_update(TaskState.IN_PROGRESS, f"complete subtask {subtask_id}, - {output}")
                if output is not None:
                    self.output_dict[subtask_id] = output

        self.log_and_update(TaskState.COMPLETE, f"completed all subtasks")

    def terminate(self) -> None:
        self.terminating = True

    def start_loop(self):
        log_counter = 0
        while not (self.state == TaskState.FAILED or self.terminating):
            if log_counter % self.log_interval == 0:
                self.log_and_update(TaskState.NOT_STARTED,"IDLE")
            self.read_from_queue()
            if self.state == TaskState.IN_PROGRESS:
                self.process_subtasks()
            sleep(self.sleep_time)
            log_counter +=1
        self.close()





#TODO add the lock to the lgoging function
        



# class MapReduceQueue:
#     def __init__(self, config, )

if __name__ == '__main__':
    # load arguments from sys.argv

    [F, W, C, task_id, num_rounds] = [int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], int(sys.argv[5])]
    freeze_support()
    # W = 2
    # F = 2
    # C = 2
    conf = MapReduceTaskConfig(W, F, C, task_id=task_id, num_rounds=num_rounds)
    dd = DesignatedDriver(conf, Manager())
    # # test methods
    bds = dd.workers
    [b.start() for b in bds]
    # dd.start()
    output = dd.start_loop()
    # dd.join()
    # send output to node
    #create a json dictionary with output and momentum nodes
    output = {
        "output": np.round(conf.output_vector, 2).tolist(),
        "momentum": np.round(conf.momentum_vector, 2).tolist()
    }
    print(output)

    # print(conf.output_vector.tolist())
    # print(conf.momentum_vector.tolist())
    sys.stdout.flush() 

# 
