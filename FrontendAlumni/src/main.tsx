import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import {RouterProvider} from 'react-router-dom'
import {routerConfig} from './routes/RouterConfig';
import { ToastContainer } from 'react-toastify';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import "keen-slider/keen-slider.min.css";
import 'animate.css';
import 'react-toastify/dist/ReactToastify.css';



ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <RouterProvider router={routerConfig}/>
        <ToastContainer theme="colored" newestOnTop />
    </React.StrictMode>,
)
