import Navbar from "./components/Navbar";
import Simulator from "./components/Simulator";
import Home from "./pages/Home";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const App = () => {
  return (
    <>
      <BrowserRouter>
      <Navbar/>
        <Routes>
          <Route path="/" element={< Home/>}></Route>
          <Route path="/simulator" element={< Simulator/>}></Route>
        </Routes>
      </BrowserRouter>
    </>
  );
};

export default App;
