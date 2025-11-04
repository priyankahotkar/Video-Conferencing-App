import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import MeetingRoom from './pages/MeetingRoom';
import CallEnded from './pages/CallEnded';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/meeting/:meetingId" element={<MeetingRoom />} />
          <Route
            path="/*"
            element={
              <>
                <Header />
                <main className="main-content">
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/call-ended" element={<CallEnded />} />
                  </Routes>
                </main>
                <Footer />
              </>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
