"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import returnAPIUrl from "@/config/config";
import { usePlayground } from "./AgentContext";

const backendAPIUrl = returnAPIUrl();
//const backendAPIUrl = "http://localhost:3003";
const SourceContext = createContext();

export function SourceProvider({ children }) {
  const [sourceId, setSourceId] = useState(null);
  const [
    isLoadingTotalDetectedCharacters,
    setIsLoadingTotalDetectedCharacters,
  ] = useState(false);
  const [totalDetectedCharacters, setTotalDetectedCharacters] = useState(0);
  const [needsTraining, setNeedsTraining] = useState(false);

  // Safely access playground context - it might not be available initially
  let aiConfig = null;
  try {
    const playgroundContext = usePlayground();
    aiConfig = playgroundContext?.aiConfig;
  } catch (error) {
    // Context not available yet, aiConfig will remain null
    console.log("Playground context not available yet");
  }

  // Fetch total characters when sourceId changes
  useEffect(() => {
    let isMounted = true;

    const fetchCharacters = async () => {
      if (!sourceId) return;

      setIsLoadingTotalDetectedCharacters(true);
      try {
        const response = await fetch(
          `${backendAPIUrl}/knowledge-source/sources/${sourceId}/characters`,
          {
            credentials: "include",
          }
        );
        const data = await response.json();
        if (isMounted) {
          setTotalDetectedCharacters(data.data.total);
        }
      } catch (error) {
        console.error("Error fetching total characters:", error);
      } finally {
        if (isMounted) {
          setIsLoadingTotalDetectedCharacters(false);
        }
      }
    };

    fetchCharacters();
    return () => {
      isMounted = false;
    };
  }, [sourceId]);

  const createSource = async (formData) => {
    const response = await fetch(`${backendAPIUrl}/knowledge-source`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });
    return await response.json();
  };

  //======================== text source
  // create or update a text source
  const updateSourceText = async (_id, text) => {
    const response = await fetch(
      `${backendAPIUrl}/knowledge-source/sources/${_id}/text`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      }
    );
    const result = await response.json();
    if (result.success || !result.error) {
      await updateTotalDetectedCharacters(_id);
    }
    return result;
  };

  // fetch text source from backend
  const fetchSourceText = async (_id) => {
    const response = await fetch(
      `${backendAPIUrl}/knowledge-source/sources/${_id}/text`,
      {
        credentials: "include",
      }
    );
    return await response.json();
  };

  //======================== file source
  // create or update a file source
  const updateSourceFile = async (_id, files) => {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`files`, file);
    });

    const response = await fetch(
      `${backendAPIUrl}/knowledge-source/sources/${_id}/files`,
      {
        method: "POST",
        credentials: "include",
        body: formData,
      }
    );
    const result = await response.json();
    if (result.success || !result.error) {
      await updateTotalDetectedCharacters(_id);
    }
    return result;
  };

  // get all files from the db
  const fetchSourceFiles = async (_id) => {
    const response = await fetch(
      `${backendAPIUrl}/knowledge-source/sources/${_id}/files`,
      {
        credentials: "include",
      }
    );
    return await response.json();
  };

  // delete an uploaded file
  const deleteSourceFile = async (_id, fileId) => {
    const response = await fetch(
      `${backendAPIUrl}/knowledge-source/sources/${_id}/files/${fileId}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );
    const result = await response.json();
    if (result.success || !result.error) {
      await updateTotalDetectedCharacters(_id);
    }
    return result;
  };

  // Delete multiple files by filename
  const deleteSourceFiles = async (_id, filenames) => {
    const response = await fetch(
      `${backendAPIUrl}/knowledge-source/sources/${_id}/delete-files`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filenames }),
      }
    );
    const result = await response.json();
    if (result.success || !result.error) {
      await updateTotalDetectedCharacters(_id);
    }
    return result;
  };

  //======================== faq source
  const updateSourceFaqs = async (_id, faqs) => {
    const response = await fetch(
      `${backendAPIUrl}/knowledge-source/sources/${_id}/faq`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ questions: faqs }),
      }
    );
    return await response.json();
  };

  const fetchSourceFaqs = async (_id) => {
    const response = await fetch(
      `${backendAPIUrl}/knowledge-source/sources/${_id}/faq`,
      {
        credentials: "include",
      }
    );
    return await response.json();
  };

  //======================== website source
  const updateSourceWebsites = async (_id, url) => {
    const response = await fetch(
      `${backendAPIUrl}/knowledge-source/sources/${_id}/crawl`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: url }),
      }
    );
    return await response.json();
  };

  const recrawlExistingPages = async (_id) => {
    const response = await fetch(
      `${backendAPIUrl}/knowledge-source/sources/${_id}/recrawl`,
      {
        method: "POST",
        credentials: "include",
      }
    );
    return await response.json();
  };

  const crawlMorePages = async (_id, count = 10) => {
    const response = await fetch(
      `${backendAPIUrl}/knowledge-source/sources/${_id}/crawl-next`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ max_pages: count }),
      }
    );
    return await response.json();
  };

  const fetchSourceWebsites = async (_id) => {
    const response = await fetch(
      `${backendAPIUrl}/knowledge-source/sources/${_id}/links`,
      {
        credentials: "include",
      }
    );
    const data = await response.json();
    if (data.error) {
      return { error: data.error };
    }
    return { links: data.links || [], message: data.message };
  };

  const deleteSourceUrls = async (_id, urls) => {
    const response = await fetch(
      `${backendAPIUrl}/knowledge-source/sources/${_id}/delete-urls`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ urls }),
      }
    );
    const data = await response.json();
    if (data.error) {
      return { error: data.error };
    }
    return data;
  };

  //======================== retrain source
  const retrainSource = async (_id, dataType) => {
    const response = await fetch(
      `${backendAPIUrl}/knowledge-source/sources/${_id}/train`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dataType }),
      }
    );
    const result = await response.json();

    // If training was successful, update needsTraining state
    if (result.success || !result.error) {
      setNeedsTraining(false);
    }

    return result;
  };

  // Function to set training needs when user makes edits
  const setTrainingNeeded = (needed = true) => {
    setNeedsTraining(needed);
  };

  // delete a source
  const deleteSource = async (_id) => {
    const response = await fetch(
      `${backendAPIUrl}/knowledge-source/sources/${_id}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );
    return await response.json();
  };

  const getAllSources = async () => {
    const response = await fetch(`${backendAPIUrl}/knowledge-source/sources`, {
      credentials: "include",
    });
    const result = await response.json();
    console.log(result, "knowledgebase result");

    // Check if the source associated with the current agent needs training
    if (
      result &&
      result.length > 0 &&
      aiConfig?.knowledgeBase?.sources?.length > 0
    ) {
      const currentAgentSourceId = aiConfig.knowledgeBase.sources[0];
      const currentAgentSource = result.find(
        (source) => source._id === currentAgentSourceId
      );
      if (currentAgentSource) {
        setNeedsTraining(currentAgentSource.needsTraining || false);
      }
    }

    return result;
  };

  const getASourceById = async (_id) => {
    const response = await fetch(
      `${backendAPIUrl}/knowledge-source/sources/${_id}`,
      {
        credentials: "include",
      }
    );
    return await response.json();
  };

  // Function to fetch processed chunks for a source
  const fetchSourceChunks = async (_id) => {
    if (!_id) return { error: "No source ID provided.", data: null };
    try {
      const response = await fetch(
        `${backendAPIUrl}/knowledge-source/sources/${_id}/chunks`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            // Include Authorization header if your backend requires it
            // 'Authorization': `Bearer ${yourAuthToken}`
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `HTTP error! status: ${response.status}`,
          details: "Could not parse error response.",
        }));
        console.error("Error fetching chunks:", response.status, errorData);
        return {
          error:
            errorData.error ||
            `Failed to fetch chunks. Status: ${response.status}`,
          details: errorData.details,
          data: null,
        };
      }
      // The backend route /api/knowledgebases/sources/:sourceId/chunks directly proxies
      // the Python response, which already nests the actual chunks under a "data" key.
      // So, response.json() here will give us { message: "success", data: { knowledgebase_id: ..., chunks: [...] } }
      const responseData = await response.json();
      return responseData; // This will be { message: "success", data: { actual_chunk_data } }
    } catch (error) {
      console.error("Network or other error fetching chunks:", error);
      return {
        error: "Network or other error fetching chunks.",
        details: error.message,
        data: null,
      };
    }
  };

  // Function to update total detected characters
  const updateTotalDetectedCharacters = async (_id) => {
    if (!_id) return;

    setIsLoadingTotalDetectedCharacters(true);
    try {
      const response = await fetch(
        `${backendAPIUrl}/knowledge-source/sources/${_id}/characters`,
        {
          credentials: "include",
        }
      );
      const data = await response.json();
      setTotalDetectedCharacters(data.data.total);
    } catch (error) {
      console.error("Error fetching total characters:", error);
    } finally {
      setIsLoadingTotalDetectedCharacters(false);
    }
  };

  return (
    <SourceContext.Provider
      value={{
        createSource,
        updateSourceText,
        updateSourceFile,
        updateSourceFaqs,
        setSourceId,
        sourceId,
        fetchSourceText,
        fetchSourceFiles,
        fetchSourceFaqs,
        deleteSourceFile,
        deleteSourceFiles,
        updateSourceWebsites,
        fetchSourceWebsites,
        deleteSourceUrls,
        retrainSource,
        deleteSource,
        getAllSources,
        getASourceById,
        totalDetectedCharacters,
        isLoadingTotalDetectedCharacters,
        recrawlExistingPages,
        crawlMorePages,
        fetchSourceChunks,
        setTrainingNeeded,
        needsTraining,
      }}
    >
      {children}
    </SourceContext.Provider>
  );
}

export function useSource() {
  return useContext(SourceContext);
}
