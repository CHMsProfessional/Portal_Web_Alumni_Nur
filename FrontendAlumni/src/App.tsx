import './App.css'
import 'bootstrap/dist/css/bootstrap.min.css';
import 'keen-slider/keen-slider.min.css';
import.meta.env


interface AppProps {
  title: string
}
const App = ({ title }: AppProps) => {


  return (
    <>
      {title}
    </>
  )
}

export default App
