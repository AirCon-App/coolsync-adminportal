import React from "react";
import Navbar from "../components/navbar";

export default function HomePage(){
    return(
        <>
        <Navbar/>
        <div className="body-container">
        <h1>Welcome to the CoolSync Admin Panel</h1>
        </div>
        </>
    )
}