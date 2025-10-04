import './App.css'
import { BrowserRouter as Router, Routes,Route } from 'react-router-dom';
import LoginPage from './pages/loginpage'
import HomePage from './pages/homepage'

function App() {

 return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage/>} />
        </Routes>
      </div>
    </Router>
  );
}

const Home = () => <h2>Home Page</h2>;
const About = () => <h2>About Page</h2>;
const Contact = () => <h2>Contact Page</h2>;
export default App
