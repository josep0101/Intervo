"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import returnAPIUrl from "@/config/config";

const backendAPIUrl = returnAPIUrl();
//const backendAPIUrl = "http://localhost:3003";

const AdminToolsContext = createContext();

export function AdminToolsProvider({ children }) {
  const fetchTools = async () => {
    const response = await fetch(`${backendAPIUrl}/get-admin-tools`, {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    return await response.json();
  };

  const createNewTool = async (voiceData) => {
    const response = await fetch(`${backendAPIUrl}/get-admin-tools/add-tool`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(voiceData),
    });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    return await response.json();
  };

  const deleteTool = async (_id) => {
    const response = await fetch(
      `${backendAPIUrl}/get-admin-tools/remove-tool/${_id}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    return await response.json();
  };

  const updateTool = async (_id, voiceData) => {
    const response = await fetch(
      `${backendAPIUrl}/get-admin-tools/update-tool/${_id}`,
      {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(voiceData),
      }
    );
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    return await response.json();
  };

  return (
    <AdminToolsContext.Provider
      value={{ createNewTool, fetchTools, deleteTool, updateTool }}
    >
      {children}
    </AdminToolsContext.Provider>
  );
}

export function useAdminTools() {
  return useContext(AdminToolsContext);
}
