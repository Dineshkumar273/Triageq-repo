import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout({children,setPage}){
 return(
  <div className="flex h-screen">
   <Sidebar setPage={setPage}/>
   <div className="flex-1 flex flex-col">
    <Header/>
    <div className="p-6 bg-gray-50 flex-1 overflow-auto">{children}</div>
   </div>
  </div>
 )
}
