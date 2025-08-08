"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import returnAPIUrl from "@/config/config";

const backendAPIUrl = returnAPIUrl();
//const backendAPIUrl = "http://localhost:3003";
const PhoneNumberContext = createContext();

export function PhoneNumberProvider({ children }) {
  // get all phone number linked to an agent
  const getUserNumbers = async () => {
    const response = await fetch(`${backendAPIUrl}/phone-number/user`, {
      credentials: "include",
    });
    return await response.json();
  };

  //get temporary phone numbers
  const getTemporaryNumbers = async () => {
    const response = await fetch(`${backendAPIUrl}/phone-number/temporary`, {
      credentials: "include",
    });
    const data = await response.json();
    if (data.error) {
      return null;
    }
    return data.temporaryNumber;
  };

  //get user purchased phone numbers
  const getPurchasedTwilioNumbers = async () => {
    const response = await fetch(
      `${backendAPIUrl}/phone-number/twilio/purchased`,
      {
        credentials: "include",
      }
    );
    const data = await response.json();
    if (data.error) {
      return [];
    }
    return data.purchasedNumbers;
  };

  //api req to assign an agent to a phone number
  const assignAgent = async (data) => {
    const { phoneNumber, agentId } = data;
    if (!phoneNumber._id) {
      const response = await fetch(`${backendAPIUrl}/phone-number/twilio/add`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agentId: agentId,
          phoneNumber: phoneNumber.phoneNumber,
          friendlyName: phoneNumber.friendlyName,
        }),
      });
      return await response.json();
    } else {
      console.log(agentId);
      const response = await fetch(
        `${backendAPIUrl}/phone-number/assign-agent/${phoneNumber._id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ agentId }),
        }
      );
      return await response.json();
    }
  };

  // remove an agent
  const removeAgent = async (phoneNumberId) => {
    const response = await fetch(
      `${backendAPIUrl}/phone-number/remove-agent/${phoneNumberId}`,
      {
        method: "DELETE",
        credentials: "include"
      }
    );
    return await response.json();
  };

  // unlink a phone number
  const unlinkPhoneNumber = async (_id) => {
    const response = await fetch(
      `${backendAPIUrl}/phone-number/unlink/${_id}`,
      {
        credentials: "include",
        method: "DELETE",
      }
    );
    return await response.json();
  };

  //

  return (
    <PhoneNumberContext.Provider
      value={{
        getUserNumbers,
        getTemporaryNumbers,
        getPurchasedTwilioNumbers,
        assignAgent,
        unlinkPhoneNumber,
        removeAgent
      }}
    >
      {children}
    </PhoneNumberContext.Provider>
  );
}

export function usePhoneNumber() {
  return useContext(PhoneNumberContext);
}
