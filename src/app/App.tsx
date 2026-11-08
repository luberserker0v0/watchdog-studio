import { ProjectWorkspace } from "../modules/project";
import StudioHeader from "./components/StudioHeader";
import "./styles.css";

export default function App() {
  return (
    <div className="studio-shell">
      <StudioHeader />
      <main className="studio-workspace"><ProjectWorkspace /></main>
    </div>
  );
}
