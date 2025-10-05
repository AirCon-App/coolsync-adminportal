import React from "react";
import { SlArrowRight } from "react-icons/sl";

export default function inventorybutton(props){
    return(
        <div className="inventory-item">
            <div>
            <h1 className="inventory-title">{props.title}</h1>
            <p className="inventory-subtitle">Quantity in Stock: {props.quantity}</p>
            </div>
            <SlArrowRight className="inventory-arrow"/>
        </div>
    )
}