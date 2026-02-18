import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import CardReader from "@/pages/CardReader";
import ContactManager from "@/pages/ContactManager";
import SMSManager from "@/pages/SMSManager";
import CloneTool from "@/pages/CloneTool";
import SecurityAnalyzer from "@/pages/SecurityAnalyzer";
import EsimConverter from "@/pages/EsimConverter";
import ExportImport from "@/pages/ExportImport";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="reader" element={<CardReader />} />
            <Route path="contacts" element={<ContactManager />} />
            <Route path="sms" element={<SMSManager />} />
            <Route path="clone" element={<CloneTool />} />
            <Route path="security" element={<SecurityAnalyzer />} />
            <Route path="esim" element={<EsimConverter />} />
            <Route path="export" element={<ExportImport />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}

export default App;
