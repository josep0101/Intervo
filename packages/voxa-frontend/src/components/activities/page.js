// "use client";
// import Container from "@/components/ui/Container";
// import { use, useEffect, useState } from "react";
// import Fuse from "fuse.js";
// import CallInbox from "./callInbox";
// import CallSummary from "./callSummary";
// import CallLog from "./callLog";
// import { Input } from "@/components/ui/input";
// import { IoAddCircleOutline } from "react-icons/io5";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { useActivities } from "@/context/ActivitiesContext";

// export const runtime = "edge";
// const Page = () => {
//   const { contacts, activities, fetchData, isFetchingData } = useActivities();

//   const [items, setItems] = useState(contacts);
//   const [selected, setSelected] = useState([]);
//   const [filtered, setFiltered] = useState([]);
//   const [selectedActivity, setSelectedActivity] = useState([]);
//   const [isSearching, setIsSearcing] = useState(false);

//   useEffect(() => {
//     fetchData();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   useEffect(() => {
//     setItems(contacts);
//     setSelected(contacts[0] || []);
//     setSelectedActivity(
//       activities.find((activity) => activity.contact === contacts[0]._id)
//     );
//   }, [isFetchingData, activities, contacts]);

//   const fuseOptions = {
//     keys: ["firstName", "lastName", "phoneNumber"],
//   };

//   const handleFilterStatusChange = (status) => {
//     if (status === "All") {
//       setItems(contacts);
//       return;
//     }

//     if (status === "Completed") {
//       setItems(contacts.filter((item) => item.status === "Completed"));
//     } else {
//       setItems(contacts.filter((item) => item.status === "Incomplete"));
//     }
//   };

//   const handleSearchInputChange = (searchTerm) => {
//     if (searchTerm === "") {
//       setIsSearcing(false);
//       return;
//     }
//     setIsSearcing(true);
//     const fuse = new Fuse(items, fuseOptions);
//     const results = fuse.search(searchTerm);
//     setFiltered(results.map((entry) => entry.item));
//     console.log(filtered);
//   };

//   if (isFetchingData)
//     return (
//       <div className="container mx-auto max-w-[1284px] flex flex-col items-start gap-6 p-2">
//         <div className="flex flex-col items-start gap-6 self-stretch px-4">
//           <h1 className="text-card-foreground font-inter text-2xl font-semibold leading-6 tracking-[-0.72px]">
//             Loading...
//           </h1>
//         </div>
//       </div>
//     );

//   return (
//     <div className="container mx-auto max-w-[1284px] flex flex-col items-start gap-6 p-2">
//       <div className="flex flex-col items-start gap-6 self-stretch px-4">
//         <div className="flex justify-between">
//           <div className="flex gap-4">
//             <Input
//               className="text-sm leading-5 text-secondaryText py-2 px-3 border border-input text-foreground truncate w-[280px] h-[32px] rounded-[6px]"
//               placeholder="Search contact no/ name"
//               onChange={(e) => handleSearchInputChange(e.target.value)}
//             />

//             {/* <DropdownMenu>
//               <DropdownMenuTrigger className="rounded-md text-sm flex items-center justify-center gap-2 bg-white text-foreground border border-dashed drop-shadow border-[#E4E4E7] py-2 px-3 h-8 leading-5">
//                 <IoAddCircleOutline className="h-4 w-4" />
//                 Status
//               </DropdownMenuTrigger>
//               <DropdownMenuContent>
//                 <DropdownMenuItem
//                   onSelect={() => handleFilterStatusChange("All")}
//                 >
//                   All
//                 </DropdownMenuItem>
//                 <DropdownMenuItem
//                   onSelect={() => handleFilterStatusChange("Completed")}
//                 >
//                   Completed
//                 </DropdownMenuItem>
//                 <DropdownMenuItem
//                   onSelect={() => handleFilterStatusChange("Incomplete")}
//                 >
//                   Incomplete
//                 </DropdownMenuItem>
//               </DropdownMenuContent>
//             </DropdownMenu> */}
//           </div>
//         </div>
//       </div>
//       <div className="grid grid-cols-12 font-inter w-full border border-border">
//         <div className="col-span-3 border-r border-border">
//           <CallInbox
//             inbox={isSearching && filtered.length >= 0 ? filtered : items}
//             selected={selected}
//             setSelected={setSelected}
//             setSelectedActivity={setSelectedActivity}
//             activities={activities}
//           />
//         </div>
//         <div className="col-span-5 border-r border-border">
//           <CallLog user={selected} selectedActivity={selectedActivity} />
//         </div>
//         <div className="col-span-4">
//           <CallSummary user={selected} />
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Page;
