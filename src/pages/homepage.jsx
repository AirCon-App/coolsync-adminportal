import React from "react";
import PageShell from "../components/PageShell";
import { SlArrowRight } from "react-icons/sl";
import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <PageShell>
      <div className="home-container">
        <Link to='/usermanagement' className="link-wrapper">
          <div className="user-info">
            <h1>Manage your User Profile</h1>
            <SlArrowRight className="home-arrow" />
          </div>
        </Link>
        <Link to='/airhandlers' className="link-wrapper">
          <div className="user-info">
            <h1>Manage your Site's Air Handlers</h1>
            <SlArrowRight className="home-arrow" />
          </div>
        </Link>
        <Link to='/inventory' className="link-wrapper">
          <div className="user-info">
            <h1>Update your Site's Inventory</h1>
            <SlArrowRight className="home-arrow" />
          </div>
        </Link>
        <Link to='/users' className="link-wrapper">
          <div className="user-info">
            <h1>Add or Remove Users</h1>
            <SlArrowRight className="home-arrow" />
          </div>
        </Link>
      </div>
    </PageShell>
  );
}
