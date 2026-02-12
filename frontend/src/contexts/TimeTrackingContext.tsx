import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface TimeEntry {
  _id: string;
  ticket: {
    _id: string;
    ticketNumber: string;
    title: string;
  };
  user: string;
  description?: string;
  startTime: string;
  endTime?: string;
  duration: number;
}

interface TimeTrackingContextType {
  activeTimer: TimeEntry | null;
  elapsedSeconds: number;
  isRunning: boolean;
  startTimer: (ticketId: string, ticketNumber: string, ticketTitle: string, description?: string) => Promise<void>;
  stopTimer: () => Promise<void>;
  formatElapsedTime: () => string;
}

const TimeTrackingContext = createContext<TimeTrackingContextType | undefined>(undefined);

export function TimeTrackingProvider({ children }: { children: ReactNode }) {
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const fetchActiveTimer = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/time/active', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.activeTimer) {
        setActiveTimer(data.activeTimer);
        setStartTime(new Date(data.activeTimer.startTime));
      } else {
        setActiveTimer(null);
        setStartTime(null);
        setElapsedSeconds(0);
      }
    } catch (error) {
      console.error('Error fetching active timer:', error);
    }
  }, []);

  useEffect(() => {
    fetchActiveTimer();
    const interval = setInterval(fetchActiveTimer, 30000);
    return () => clearInterval(interval);
  }, [fetchActiveTimer]);

  useEffect(() => {
    if (!startTime) return;

    const updateElapsed = () => {
      setElapsedSeconds(Math.floor((Date.now() - startTime.getTime()) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const startTimer = async (
    ticketId: string,
    ticketNumber: string,
    ticketTitle: string,
    description?: string
  ) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/time/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ticketId,
          description,
          ticket: { _id: ticketId, ticketNumber, title: ticketTitle },
        }),
      });

      const data = await response.json();
      setActiveTimer(data.timeEntry);
      setStartTime(new Date(data.timeEntry.startTime));
    } catch (error) {
      console.error('Error starting timer:', error);
      throw error;
    }
  };

  const stopTimer = async () => {
    if (!activeTimer) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/time/stop/${activeTimer._id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      setActiveTimer(null);
      setStartTime(null);
      setElapsedSeconds(0);
    } catch (error) {
      console.error('Error stopping timer:', error);
      throw error;
    }
  };

  const formatElapsedTime = () => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <TimeTrackingContext.Provider
      value={{
        activeTimer,
        elapsedSeconds,
        isRunning: !!activeTimer,
        startTimer,
        stopTimer,
        formatElapsedTime,
      }}
    >
      {children}
    </TimeTrackingContext.Provider>
  );
}

export function useTimeTracking() {
  const context = useContext(TimeTrackingContext);
  if (context === undefined) {
    throw new Error('useTimeTracking must be used within a TimeTrackingProvider');
  }
  return context;
}
