/* Quiet Signal: the app shell stays dark, composed, and free of dashboard clutter. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AuthPage from "./pages/AuthPage";
import AuthCallback from "./pages/AuthCallback";
import AccountDetails from "./pages/AccountDetails";
import JobRadarPage from "./pages/JobRadarPage";
import LiveInterview from "./pages/LiveInterview";
import PracticeSetup from "./pages/PracticeSetup";
import InterviewPerformanceDashboard from "./pages/InterviewPerformanceDashboard";
import InterviewReportPage from "./pages/InterviewReportPage";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/login"><AuthPage mode="login" /></Route>
      <Route path="/signup"><AuthPage mode="signup" /></Route>
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/account" component={AccountDetails} />
      <Route path="/jobs" component={JobRadarPage} />
      <Route path="/dashboard" component={InterviewPerformanceDashboard} />
      <Route path="/interview-report" component={InterviewReportPage} />
      <Route path="/live-interview" component={LiveInterview} />
      <Route path="/practice-setup"><PracticeSetup showNavbar={true} /></Route>
      <Route path="/" component={Home} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

import { useGlobalPointerTracker } from "./hooks/useGlobalPointerTracker";

function AppContent() {
  const { theme } = useTheme();
  useGlobalPointerTracker();
  return <TooltipProvider><Toaster theme={theme} /><Router /></TooltipProvider>;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
