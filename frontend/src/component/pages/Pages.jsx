import React, { useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { TransitionGroup, CSSTransition } from 'react-transition-group'
import Navbars from '../Navigation/navbar'
import Home from '../Home/home'
import About from '../About/about'
import Gym from '../Service/gym'
import BeautySalon from '../Service/beautisalon'
import Spa from '../Service/spa'
import Ourpackages from '../Service/packages'
import HealthTips from '../Helthtip/healthtips'
import HealthTipsDetail from '../Helthtip/tipsdetail'
import Contact from '../Contactus/contactus'
import Login from '../AdminDashboard/Login'
import AdminPages from '../AdminDashboard/pages/MainPages'

// Child component so useLocation() runs inside <Router>
const AnimatedRoutes = () => {
  const location = useLocation()
  const nodeRef = useRef(null)

  return (
    <TransitionGroup>
      <CSSTransition
        key={location.pathname}
        classNames="fade"
        timeout={200}
        nodeRef={nodeRef}
      >
        <div ref={nodeRef}>
          <Routes location={location}>
            {/* Main pages */}
            <Route path="/" element={<Home />} />
            <Route path="/aboutus" element={<About />} />
            <Route path="/ourpackages" element={<Ourpackages />} />

            {/* Health tips + detail  👇 */}
            <Route path="/healthtips" element={<HealthTips />} />
            <Route path="/healthtips/:id" element={<HealthTipsDetail />} />

            <Route path="/contact" element={<Contact />} />
            <Route path="/ourservice/gym" element={<Gym />} />
            <Route path="/ourservice/spa" element={<Spa />} />
            <Route path="/ourservice/beauty-salon" element={<BeautySalon />} />

            {/* Auth + admin */}
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={<AdminPages />} />
          </Routes>
        </div>
      </CSSTransition>
    </TransitionGroup>
  )
}

const AppWithRouter = () => (
  <Router>
    <Navbars />
    <AnimatedRoutes />
  </Router>
)

export default AppWithRouter