/** @module App*/
import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import nextId from "react-id-generator";
import { db, storage } from './firebase';
import {
  collection,
  onSnapshot,
  serverTimestamp,
  setDoc,
  doc
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  listAll,
} from "firebase/storage";
import Task from './Components/Task';
import EditModal from './Modals/EditModal';

/** Компонент, возвращающий форму создания задания и массив компонентов Task*/
function App() {
  /** Значения, введенные в поля создания задания */
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDate, setTaskDate] = useState(dayjs().format());
  const [taskFile, setTaskFile] = useState(null);

  /** Трекер, необходимый для отслеживания добавления нового задания и скачивания с сервера обновленного списка*/
  const [NewTasksTracker, addNewTask] = useState(0);

  /** Промежуточные состояния заданий и их файлов по отдельности */
  const [downloadedTasks, setDownloadedTasks] = useState([]);
  const [downloadedFiles, setDownloadedFiles] = useState({});

  /** Задания с прикрепленными файлами */
  const [tasksWithFiles, setFilesToTasks] = useState([]);

  /** Состояние модального окна редактирования задания */
  const [editModalState, setEditModalState] = useState({ state:'closed', currentTask: null })
  const storageRef = ref(storage, 'files/');

  /** Функция, передающая файл на сервер и скачивающая его url для добавления в массив файлов
   * @param {object} file - объект данных о загруженным пользователем файле
   * @param {id} id - id задания (добавляется в имя файла для возможности соотнести задание с файлом)
  */
  const uploadFile = (file, id) => {
    const fileRef = ref(storage, `files/${id}--${file.name}`);
    uploadBytes(fileRef, file).then((snapshot) => {
      const snapshotName = snapshot.metadata.name;
      getDownloadURL(snapshot.ref).then((url) => {
        const taskIdOfFile = snapshotName.split('--')[0];
        setDownloadedFiles((downloadedFiles) => {
          return {...downloadedFiles, [taskIdOfFile]: {url, fileRef} };
        });
      });
    });
  };
  /** При изменении значения трекера новых заданий происходит скачивание всего списка задач
   * и добавление его в массив downloadedTasks
  */
  useEffect(() => {
    onSnapshot(collection(db,'todos'),(snapshot)=>{
      setDownloadedTasks((downloadedTasks) => {
       return snapshot.docs.map(doc => doc.data())
      })
    });
  },[NewTasksTracker]);

  /** При изменении массивов файлов или задач происходит их объединение и добавление в массив tasksWithFiles*/
  useEffect(() => {
    setFilesToTasks(() => {
      const result = downloadedTasks.map((task) => {
        if (Object.keys(downloadedFiles).includes(task.id)) {
          return { ...task, taskFile: downloadedFiles[task.id] }
        }
        return task;
      })
      return result;
    });
  }, [downloadedFiles, downloadedTasks]); 

  /** При рендере компонента App скачивается массив файлов, находится их id, name, ref и кладется в массив файлов
   * в виде [id задачи]: {url, fileRef}
  */
  useEffect(() => {
    listAll(storageRef).then((response) => {
      response.items.forEach((item) => {
        const taskIdOfFile = item._location.path.split('/')[1].split('--')[0];
        const fileName = item._location.path.split('/')[1].split('--')[1];
        const fileRef = ref(storage, `files/${taskIdOfFile}--${fileName}`);
        getDownloadURL(item).then((url) => {
          setDownloadedFiles((downloadedFiles) => {
            return {...downloadedFiles, [taskIdOfFile]: { url,fileRef } };
          });
        });
      });
    });
  }, []);

  /** При нажатии на кнопку "создать" происходит отправка задачи на сервер, вызов функции uploadFile, если файл прикреплен,
   * очистка полей формы.
  */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (taskTitle === '') return;
    const task = {
      id: nextId(),
      taskTitle,
      taskDescription,
      taskDate,
      taskIsDone: false,
    };
    setDoc(doc(db,'todos', task.id),
      {
        ...task,
        timestamp: serverTimestamp()
      }
    );
    if (taskFile !== null) {
     uploadFile(taskFile, task.id);
    };
    addNewTask((NewTasksTracker) => NewTasksTracker + 1);

    setTaskTitle('');
    setTaskDescription('');
    setTaskDate(dayjs().format());
  };

  /** Функция, меняющая состояние модального окна редактирования задачи
   * @param {object} task 
  */
  const changeTask = (task) => {
    setEditModalState((prev) => {
      return { ...prev, state: 'open', currentTask: task }
    });
  };

  return (
    <div className="App">
      <header>
        Todo
      </header>
      <main>
        <form onSubmit={handleSubmit} className="newTaskForm">
          <div className='flexRow'>
            <div className="flexColumn w-100">
              <div className="flexColumn deadline">
                <span>Выполнить до: </span>
                <input 
                  type="datetime-local"
                  className="date-time"
                  onChange={e => setTaskDate(dayjs(e.target.value).format())}
                />
              </div>
              <input 
                placeholder="Введите заголовок..." 
                className="textInput"
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
              />
              <input 
                placeholder="Введите описание..."
                className="textInput"
                value={taskDescription}
                onChange={e => setTaskDescription(e.target.value)}
              />
              <input 
                type="file"
                className="fileInput"
                onChange={e => setTaskFile(e.target.files[0])}
              />
              <button type="submit" className="createBtn">Cоздать</button>
            </div>
          </div>
        </form>
        <div className="tasksBlock">
          {tasksWithFiles
          /** сортировка задач по времени их создания*/
            .sort((task1, task2) => task1.timestamp < task2.timestamp)
            .map((task) => {
              return (
                <Task task={task} changeTask={changeTask} key={nextId()}/>
              )
           }) 
          }
        </div>
      </main>
      {
        editModalState.state === 'open'
        && <EditModal
            task={editModalState.currentTask}
            uploadFile={uploadFile}
            setEditModalState={setEditModalState}
          />
      }
    </div> 
  );
}

export default App;
