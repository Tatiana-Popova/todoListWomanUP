/** @module Task*/
import React, { useState, useEffect } from "react";
import { serverTimestamp, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { deleteObject } from "firebase/storage";
import 'firebase/firestore';
import dayjs from 'dayjs';
import { db } from "../firebase";

/** компонент Task, принимащий через свойства задачу task и функцию changeTask(открытие модального окна)*/
const Task = ({task, changeTask}) => {
  /** @type {object} dateTymeNow - текущее дата и время в формате dayjs */
  const dateTimeNow = dayjs();

  /** @type {object} daskDeadLine - время сдачи задания в формате dayjs*/
  const taskDeadline = dayjs(task.taskDate);

  /** @type {number} timeDiff - кол-во миллисекунд до сдачи задания */
  const timeDiff = taskDeadline.diff(dateTimeNow);

  /** Состояние таймера ('running/'over')*/
  const [timerState, setTimerState] = useState('running');

  /** При рендере задачи запускается таймер - сколько миллисекунд осталось до сдачи задания */
  useEffect(() => {
    setTimeout(() => {
      setTimerState('over');
    }, timeDiff)
  }, []);

  /** Функция удаления задачи с сервера
   * @param {object} fileRef
  */
  const deleteTask = async(fileRef) => {
    await deleteDoc(doc(db, "todos", task.id));
    if (task.taskFile) {
      await deleteObject(task.taskFile.fileRef);
    }
  }
  /** Функция изменения состояния выполнения задачи на сервере */
  const changeIsTaskDone = () => {
    setDoc(
      doc(db,'todos', task.id),
      {
        id: task.id,
        taskTitle: task.taskTitle,
        taskDescription: task.taskDescription,
        taskDate: task.taskDate,
        taskIsDone: !task.taskIsDone,
        timestamp: serverTimestamp()
      }
    );
  }
  return (
    <div className={`task ${task.taskIsDone && 'doneTaskStyle'}`}>
      <div className={`taskData ${(timerState === 'over') ? 'overTimerStyle' : ''}`}>
        До: {dayjs(task.taskDate).format('DD/MM/YYYY HH:mm')}
      </div>
      {task.taskFile && <a className="taskData files" href={task.taskFile.url}>просмотр вложений</a>}
      <div
        className={`taskTitle ${task.taskIsDone && 'doneTitleStyle'}`}
        onClick={() => changeIsTaskDone()}
      >
        {(task.taskTitle)}
      </div>
      <div className="taskDescription">{task.taskDescription}</div>
      
      <div className="edit_delete_section">
        <i className="icon_edit" onClick={() => changeTask(task)}></i>
        <i className="icon_delete" onClick={() => deleteTask()}></i>
      </div>
    </div>
  )
};

export default Task;