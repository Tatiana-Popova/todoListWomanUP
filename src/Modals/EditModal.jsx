/** @module EditModule */
import { useRef, useState } from "react";
import dayjs from 'dayjs';
import { useEffect } from "react";
import { db } from "../firebase";
import { serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { deleteObject } from "firebase/storage";

/** Компонент - модальное окно редактирования задачи, принимающее как свойства задачу, функцию 
 * для изменения состояния окна (чтобы закрыть), функцию загрузки файла на сервер.
*/
const EditModal = ({ task, setEditModalState, uploadFile }) => {
  /** Значения, введенные в поля редактирования задания. По умолчанию - значения таски до реадактирования */
  const [taskTitle, setTaskTitle] = useState(task.taskTitle);
  const [taskDescription, setTaskDescription] = useState(task.taskDescription);
  const [taskFile, setTaskFile] = useState(null);
  const [taskDate, setTaskDate] = useState(task.taskDate);

  const titleRef = useRef();

  useEffect(() => {
    titleRef.current.select();
  }, [])

  /** При нажатии на кнопку "Сохранить" происходит отправка обновленного задания на сервер,
   * обновление файла на сервере (удаление и создание нового) при его загрузке пользователем.
   * Закрытие модального окна.
  */
  const handleSubmit = async(e) => {
    e.preventDefault();
    const updatedTask = {
      id: task.id,
      taskTitle,
      taskDescription,
      taskDate,
    }
    setDoc(doc(db,'todos', task.id),{
      ...updatedTask,
      timestamp: serverTimestamp()
    });
    
    if (taskFile) {
      if (task.taskFile) {
        await deleteObject(task.taskFile.fileRef);
      }
      uploadFile(taskFile, task.id);
    }
    
    setEditModalState((prev) => {
      return {...prev, state:'closed', currentTask: null}
    });
  }

  return (
    <div id="myModal" className="modal">
      <div className="modal-content">
        <span className="close" onClick={() => {
          setEditModalState((prev) => {
            return {...prev, state:'closed', currentTask: null}
          })
        }}
        >
          &times;
        </span>
       <form onSubmit={handleSubmit} className="editTaskForm">
          <div className="flexColumn w-100">
            <div className="flexColumn editDeadline">
              <span>Выполнить до: </span>
              <input 
                type="datetime-local"
                className="editDate-time"
                onChange={e => setTaskDate(dayjs(e.target.value).format())}
              />
            </div>
            <input 
              placeholder="Введите заголовок..." 
              defaultValue={task.taskTitle}
              ref={titleRef}
              onChange={e => setTaskTitle(e.target.value)}
            />
            <input 
              placeholder="Введите описание..."
              defaultValue={task.taskDescription}
              onChange={e => setTaskDescription(e.target.value)}
            />
            Обновить приложение:
            <input 
              type="file" 
              onChange={e => setTaskFile(e.target.files[0])}
            />
            <button type="submit" className="saveButton">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  )  
};

export default EditModal;