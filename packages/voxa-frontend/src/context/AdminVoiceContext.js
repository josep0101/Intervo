"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import returnAPIUrl from "@/config/config";

const backendAPIUrl = returnAPIUrl();
//const backendAPIUrl = "http://localhost:3003";

const AdminVoiceContext = createContext();

export function AdminVoiceProvider({ children }) {
  // fetch voices
  const fetchVoices = async (voiceData) => {
    const response = await fetch(`${backendAPIUrl}/get-admin-voices`, {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    return await response.json();
  };

  // create a new voice
  const createNewVoice = async (voiceData) => {
    const response = await fetch(
      `${backendAPIUrl}/get-admin-voices/add-voice`,
      {
        method: "POST",
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

  const deleteVoice = async (_id) => {
    const response = await fetch(
      `${backendAPIUrl}/get-admin-voices/remove-voice/${_id}`,
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

  const updateVoice = async (_id, voiceData) => {
    const response = await fetch(
      `${backendAPIUrl}/get-admin-voices/update-voice/${_id}`,
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
    <AdminVoiceContext.Provider
      value={{ createNewVoice, fetchVoices, deleteVoice, updateVoice }}
    >
      {children}
    </AdminVoiceContext.Provider>
  );
}

export function useAdminVoice() {
  return useContext(AdminVoiceContext);
}
