/* cSpell:ignore markercluster geosearch jsearch rapidapi fintech PARTTIME spiderfy */
import React, { useState, useEffect, useRef } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  useMap,
  Circle 
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/leaflet.markercluster.js';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import { Icon, divIcon, point } from 'leaflet';
import { useTranslation } from 'react-i18next';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { OpenStreetMapProvider } from 'leaflet-geosearch';
import L from 'leaflet';
import { BookmarkIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

// Fix for default marker icon in React
const defaultIcon = new Icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Update the job type to include url property
type Job = {
  id: number;
  title: string;
  company: string;
  location: string;
  lat: number;
  lng: number;
  description: string;
  salary: string;
  skills: string[];
  industry: string;
  url?: string; // Optional url property
  jobType?: string; // Added job type (full-time, part-time, etc.)
  experienceLevel?: string; // Added experience level
  salaryRange?: {
    min: number;
    max: number;
  };
};

// Define a type for favorite jobs
type FavoriteJob = {
  id: number;
  dateAdded: string;
};

// Define params for the search
type SearchParams = {
  query: string;
  location?: string;
  radius?: number;  // in km
  jobType?: string;
  minSalary?: number;
  maxSalary?: number;
  experienceLevel?: string;
};

// Function to create marker clusters
// This needs to be outside of the component due to React's rendering cycle
const createClusterCustomIcon = function (cluster: any) {
  return divIcon({
    html: `<span class="cluster-icon">${cluster.getChildCount()}</span>`,
    className: 'custom-marker-cluster',
    iconSize: point(33, 33, true)
  });
};

// Define a component to handle location search
const LocationSearch = ({ onSelectLocation }: { onSelectLocation: (lat: number, lng: number) => void }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const provider = new OpenStreetMapProvider();
  const { t } = useTranslation();

  const handleSearch = async () => {
    if (searchQuery.trim() === '') {
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await provider.search({ query: searchQuery + ' India' });
      setSearchResults(results.slice(0, 5)); // Limit to 5 results
    } catch (error) {
      console.error('Error searching locations:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocationSelect = (lat: number, lng: number, displayName: string) => {
    onSelectLocation(lat, lng);
    setSearchResults([]);
    setSearchQuery(displayName);
  };

  return (
    <div style={{ position: 'relative', marginBottom: '10px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('jobLocations.searchPlaceholder', 'Search locations in India...')}
          style={{
            flex: 1,
            backgroundColor: 'rgba(31, 41, 55, 0.8)',
            color: '#e5e7eb',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #374151',
            outline: 'none',
            fontSize: '0.875rem',
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
        />
        <button
          onClick={handleSearch}
          disabled={isSearching}
          style={{
            backgroundColor: isSearching ? 'rgba(55, 65, 81, 0.5)' : 'rgba(79, 70, 229, 0.2)',
            color: isSearching ? '#9ca3af' : '#a5b4fc',
            padding: '8px 12px',
            borderRadius: '6px',
            border: `1px solid ${isSearching ? '#4b5563' : '#4f46e5'}`,
            outline: 'none',
            fontSize: '0.875rem',
            cursor: isSearching ? 'default' : 'pointer',
          }}
        >
          {isSearching ? t('jobLocations.searching', 'Searching...') : t('jobLocations.search', 'Search')}
        </button>
      </div>

      {searchResults.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: 'rgba(31, 41, 55, 0.95)',
          borderRadius: '6px',
          border: '1px solid #374151',
          marginTop: '4px',
          maxHeight: '200px',
          overflowY: 'auto',
        }}>
          {searchResults.map((result, index) => (
            <div
              key={index}
              style={{
                padding: '8px 12px',
                borderBottom: index < searchResults.length - 1 ? '1px solid #374151' : 'none',
                cursor: 'pointer',
                color: '#e5e7eb',
                fontSize: '0.875rem',
              }}
              onClick={() => handleLocationSelect(result.y, result.x, result.label)}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(55, 65, 81, 0.8)' }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              {result.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Component to get user's current location
const UserLocationButton = ({ onGetLocation }: { onGetLocation: () => void }) => {
  const { t } = useTranslation();
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const handleGetLocation = () => {
    setIsGettingLocation(true);
    onGetLocation();
    // Reset after a timeout in case geolocation is blocked or takes too long
    setTimeout(() => setIsGettingLocation(false), 3000);
  };

  return (
    <button
      onClick={handleGetLocation}
      disabled={isGettingLocation}
      style={{
        backgroundColor: isGettingLocation ? 'rgba(55, 65, 81, 0.5)' : 'rgba(79, 70, 229, 0.2)',
        color: isGettingLocation ? '#9ca3af' : '#a5b4fc',
        padding: '8px 12px',
        borderRadius: '6px',
        border: `1px solid ${isGettingLocation ? '#4b5563' : '#4f46e5'}`,
        outline: 'none',
        fontSize: '0.875rem',
        cursor: isGettingLocation ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      {isGettingLocation ? (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="15 85" />
          </svg>
          {t('jobLocations.locating', 'Locating...')}
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z" />
            <path d="M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8z" />
          </svg>
          {t('jobLocations.findNearMe', 'Find Jobs Near Me')}
        </>
      )}
    </button>
  );
};

// Component for setting the center of the map
const SetMapCenter = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
};

// Component for showing the user's location
const UserLocationMarker = ({ position }: { position: [number, number] }) => {
  return (
    <>
      <Marker
        position={position}
        icon={new Icon({
          iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9Imx1Y2lkZSBsdWNpZGUtY2lyY2xlLWRvdCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxIiBmaWxsPSIjZmZmZmZmIi8+PC9zdmc+',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        })}
      >
        <Popup>
          <div>You are here</div>
        </Popup>
      </Marker>
      <Circle center={position} radius={3000} pathOptions={{ color: '#4f46e5', fillColor: '#4f46e5', fillOpacity: 0.1 }} />
    </>
  );
};

const JobLocations = () => {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedJob, setSelectedJob] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New state variables for enhanced features
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]); // Center of India
  const [mapZoom, setMapZoom] = useState(5);
  const [searchParams] = useState<SearchParams>({ query: '' });
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [showUserLocation, setShowUserLocation] = useState(false);
  const [favoriteJobs, setFavoriteJobs] = useState<FavoriteJob[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [jobTypeFilter, setJobTypeFilter] = useState('all');
  const [experienceLevelFilter, setExperienceLevelFilter] = useState('all');
  const [salaryRangeFilter, setSalaryRangeFilter] = useState<[number, number]>([0, 5000000]); // 0 to 50 Lakhs
  const mapRef = useRef<L.Map | null>(null);

  // Enhanced job data with more details
  const initialJobs: Job[] = [
    { 
      id: 1, 
      title: 'Software Engineer', 
      company: 'TechCorp India', 
      location: 'Bangalore', 
      lat: 12.9716, 
      lng: 77.5946,
      description: 'Full-stack developer role for recent graduates',
      salary: '₹6,00,000 - ₹8,00,000',
      skills: ['JavaScript', 'React', 'Node.js'],
      industry: 'technology',
      jobType: 'Full-time',
      experienceLevel: 'Entry-level',
      salaryRange: { min: 600000, max: 800000 },
      url: 'https://example.com/job1'
    },
    { 
      id: 2, 
      title: 'Science Teacher', 
      company: 'Delhi Public School', 
      location: 'Delhi', 
      lat: 28.7041, 
      lng: 77.1025,
      description: 'Teaching science for 8th-10th grade students',
      salary: '₹4,00,000 - ₹5,00,000',
      skills: ['Teaching', 'Science', 'Curriculum Development'],
      industry: 'education',
      jobType: 'Full-time',
      experienceLevel: 'Mid-level',
      salaryRange: { min: 400000, max: 500000 },
      url: 'https://example.com/job2'
    },
    { 
      id: 3, 
      title: 'Mechanical Engineer', 
      company: 'Tata Motors', 
      location: 'Pune', 
      lat: 18.5204, 
      lng: 73.8567,
      description: 'Entry-level mechanical engineering position',
      salary: '₹5,00,000 - ₹7,00,000',
      skills: ['CAD', 'Mechanical Design', 'Problem Solving'],
      industry: 'automotive',
      jobType: 'Full-time',
      experienceLevel: 'Entry-level',
      salaryRange: { min: 500000, max: 700000 },
      url: 'https://example.com/job3'
    },
    { 
      id: 4, 
      title: 'Data Analyst', 
      company: 'Analytics India', 
      location: 'Hyderabad', 
      lat: 17.3850, 
      lng: 78.4867,
      description: 'Entry-level data analysis position with focus on business intelligence',
      salary: '₹5,50,000 - ₹7,50,000',
      skills: ['SQL', 'Python', 'Data Visualization'],
      industry: 'analytics',
      jobType: 'Full-time',
      experienceLevel: 'Entry-level',
      salaryRange: { min: 550000, max: 750000 },
      url: 'https://example.com/job4'
    },
    { 
      id: 5, 
      title: 'Civil Engineer', 
      company: 'Infrastructure Solutions', 
      location: 'Mumbai', 
      lat: 19.0760, 
      lng: 72.8777,
      description: 'Junior civil engineer for infrastructure projects',
      salary: '₹4,50,000 - ₹6,00,000',
      skills: ['AutoCAD', 'Structural Analysis', 'Project Management'],
      industry: 'construction',
      jobType: 'Full-time',
      experienceLevel: 'Entry-level',
      salaryRange: { min: 450000, max: 600000 },
      url: 'https://example.com/job5'
    },
    { 
      id: 6, 
      title: 'Marketing Coordinator', 
      company: 'Global Brands', 
      location: 'Mumbai', 
      lat: 19.0730, 
      lng: 72.8830,
      description: 'Support marketing campaigns and social media initiatives',
      salary: '₹3,50,000 - ₹5,00,000',
      skills: ['Social Media', 'Content Marketing', 'Analytics'],
      industry: 'marketing',
      jobType: 'Part-time',
      experienceLevel: 'Entry-level',
      salaryRange: { min: 350000, max: 500000 },
      url: 'https://example.com/job6'
    },
    { 
      id: 7, 
      title: 'Senior Software Architect', 
      company: 'TechGlobal', 
      location: 'Bangalore', 
      lat: 12.9789, 
      lng: 77.5917,
      description: 'Lead architecture design for enterprise applications',
      salary: '₹25,00,000 - ₹35,00,000',
      skills: ['Java', 'Microservices', 'AWS', 'System Design'],
      industry: 'technology',
      jobType: 'Full-time',
      experienceLevel: 'Senior-level',
      salaryRange: { min: 2500000, max: 3500000 },
      url: 'https://example.com/job7'
    },
    { 
      id: 8, 
      title: 'UI/UX Designer', 
      company: 'Creative Solutions', 
      location: 'Pune', 
      lat: 18.5150, 
      lng: 73.8560,
      description: 'Design user interfaces for web and mobile applications',
      salary: '₹7,00,000 - ₹12,00,000',
      skills: ['Figma', 'Adobe XD', 'User Research', 'Prototyping'],
      industry: 'design',
      jobType: 'Contract',
      experienceLevel: 'Mid-level',
      salaryRange: { min: 700000, max: 1200000 },
      url: 'https://example.com/job8'
    }
  ];

  // List of industries for the filter
  const industries = [
    { id: 'all', name: t('jobLocations.allIndustries', 'All Industries') },
    { id: 'technology', name: t('jobLocations.technology', 'Technology') },
    { id: 'education', name: t('jobLocations.education', 'Education') },
    { id: 'healthcare', name: t('jobLocations.healthcare', 'Healthcare') },
    { id: 'manufacturing', name: t('jobLocations.manufacturing', 'Manufacturing') },
    { id: 'automotive', name: t('jobLocations.automotive', 'Automotive') },
    { id: 'analytics', name: t('jobLocations.analytics', 'Analytics') },
    { id: 'construction', name: t('jobLocations.construction', 'Construction') },
    { id: 'marketing', name: t('jobLocations.marketing', 'Marketing') },
    { id: 'design', name: t('jobLocations.design', 'Design') }
  ];

  // Job types for filtering
  const jobTypes = [
    { id: 'all', name: t('jobLocations.allTypes', 'All Types') },
    { id: 'Full-time', name: t('jobLocations.fullTime', 'Full-time') },
    { id: 'Part-time', name: t('jobLocations.partTime', 'Part-time') },
    { id: 'Contract', name: t('jobLocations.contract', 'Contract') },
    { id: 'Freelance', name: t('jobLocations.freelance', 'Freelance') },
    { id: 'Internship', name: t('jobLocations.internship', 'Internship') }
  ];

  // Experience levels for filtering
  const experienceLevels = [
    { id: 'all', name: t('jobLocations.allLevels', 'All Levels') },
    { id: 'Entry-level', name: t('jobLocations.entryLevel', 'Entry Level') },
    { id: 'Mid-level', name: t('jobLocations.midLevel', 'Mid Level') },
    { id: 'Senior-level', name: t('jobLocations.seniorLevel', 'Senior Level') }
  ];

  // Initialize jobs on component mount
  useEffect(() => {
    // Set initial jobs
    setJobs(initialJobs);
    setFilteredJobs(initialJobs);
    
    // Load saved favorite jobs from localStorage
    const savedFavorites = localStorage.getItem('favoriteJobs');
    if (savedFavorites) {
      try {
        setFavoriteJobs(JSON.parse(savedFavorites));
      } catch (e) {
        console.error('Error loading favorite jobs:', e);
      }
    }
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Filter jobs when criteria change
  useEffect(() => {
    let filtered = jobs;

    // Filter by industry
    if (selectedIndustry !== 'all') {
      filtered = filtered.filter(job => job.industry === selectedIndustry);
    }

    // Filter by job type
    if (jobTypeFilter !== 'all') {
      filtered = filtered.filter(job => job.jobType === jobTypeFilter);
    }

    // Filter by experience level
    if (experienceLevelFilter !== 'all') {
      filtered = filtered.filter(job => job.experienceLevel === experienceLevelFilter);
    }

    // Filter by salary range
    filtered = filtered.filter(job => 
      job.salaryRange && 
      job.salaryRange.min <= salaryRangeFilter[1] && 
      job.salaryRange.max >= salaryRangeFilter[0]
    );

    // Filter favorites if needed
    if (showFavorites) {
      const favoriteIds = favoriteJobs.map(fav => fav.id);
      filtered = filtered.filter(job => favoriteIds.includes(job.id));
    }

    setFilteredJobs(filtered);
  }, [selectedIndustry, jobs, jobTypeFilter, experienceLevelFilter, salaryRangeFilter, showFavorites, favoriteJobs]);

  // Handler for industry filter change
  const handleIndustryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedIndustry(e.target.value);
  };

  // Handler for job type filter change
  const handleJobTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setJobTypeFilter(e.target.value);
  };

  // Handler for experience level filter change
  const handleExperienceLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setExperienceLevelFilter(e.target.value);
  };

  // Handler for salary range filter change
  const handleSalaryRangeChange = (range: [number, number]) => {
    setSalaryRangeFilter(range);
  };

  // Handler for selecting a job from the list
  const handleJobClick = (jobId: number) => {
    setSelectedJob(jobId === selectedJob ? null : jobId);
    
    // Find the job and center the map on its location
    if (jobId !== selectedJob) {
      const job = jobs.find(j => j.id === jobId);
      if (job) {
        setMapCenter([job.lat, job.lng]);
        setMapZoom(12);
      }
    }
  };

  // Function to toggle favorite status
  const toggleFavorite = (jobId: number) => {
    const isCurrentlyFavorite = favoriteJobs.some(job => job.id === jobId);
    
    let newFavorites: FavoriteJob[];
    if (isCurrentlyFavorite) {
      // Remove from favorites
      newFavorites = favoriteJobs.filter(job => job.id !== jobId);
    } else {
      // Add to favorites
      newFavorites = [...favoriteJobs, { id: jobId, dateAdded: new Date().toISOString() }];
    }
    
    setFavoriteJobs(newFavorites);
    
    // Save to localStorage
    localStorage.setItem('favoriteJobs', JSON.stringify(newFavorites));
  };

  // Check if a job is a favorite
  const isFavorite = (jobId: number): boolean => {
    return favoriteJobs.some(job => job.id === jobId);
  };

  // Toggle showing only favorites
  const toggleShowFavorites = () => {
    setShowFavorites(!showFavorites);
  };

  // Handler for location search selection
  const handleLocationSelect = (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
    setMapZoom(12);
  };

  // Handler for getting user's current location
  const handleGetUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setMapCenter([latitude, longitude]);
          setMapZoom(12);
          setShowUserLocation(true);
        },
        (error) => {
          console.error('Error getting location:', error);
          setError(t('jobLocations.locationError', 'Could not get your location. Please check browser permissions.'));
        }
      );
    } else {
      setError(t('jobLocations.geoNotSupported', 'Geolocation is not supported by your browser.'));
    }
  };

  // Function to match industry based on job title
  const matchIndustry = (title: string): string => {
    title = title.toLowerCase();
    if (title.includes('software') || title.includes('developer') || title.includes('engineer') || title.includes('tech') || title.includes('it ')) {
      return 'technology';
    } else if (title.includes('teacher') || title.includes('tutor') || title.includes('professor')) {
      return 'education';
    } else if (title.includes('doctor') || title.includes('nurse') || title.includes('health')) {
      return 'healthcare';
    } else if (title.includes('manufacturing') || title.includes('production')) {
      return 'manufacturing';
    } else if (title.includes('car') || title.includes('vehicle') || title.includes('automotive')) {
      return 'automotive';
    } else if (title.includes('data') || title.includes('analyst') || title.includes('analytics')) {
      return 'analytics';
    } else if (title.includes('construction') || title.includes('civil')) {
      return 'construction';
    } else if (title.includes('marketing') || title.includes('brand') || title.includes('sales')) {
      return 'marketing';
    } else if (title.includes('design') || title.includes('ux') || title.includes('ui')) {
      return 'design';
    } else {
      return 'technology'; // Default
    }
  };

  // Function to fetch real-time job data from RapidAPI JSearch
  const fetchJobData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Build the query parameters
      let query = 'jobs in';
      if (searchParams.query) {
        query = `${searchParams.query} jobs in`;
      }
      if (searchParams.location) {
        query += ` ${searchParams.location}`;
      } else {
        query += ' India';
      }

      // RapidAPI JSearch API Call configuration
      const options = {
        method: 'GET',
        url: 'https://jsearch.p.rapidapi.com/search',
        params: {
          query,
          page: '1',
          num_pages: '1'
        },
        headers: {
          'X-RapidAPI-Key': '4a3a56c3b3msh9a616af078d38a1p1313f3jsn542142836054',
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
        }
      };

      // Make the actual API call
      let apiJobs = [];
      try {
        const response = await axios.request(options);
        console.log('API Response:', response.data);
        
        // Map API data to our job format
        if (response.data && response.data.data) {
          apiJobs = response.data.data.map((item: any) => {
            let jobType: string;
            switch (item.job_employment_type) {
              case 'FULLTIME': jobType = 'Full-time'; break;
              case 'PARTTIME': jobType = 'Part-time'; break;
              case 'CONTRACT': jobType = 'Contract'; break;
              case 'INTERNSHIP': jobType = 'Internship'; break;
              default: jobType = 'Full-time';
            }

            let experienceLevel: string;
            switch (item.job_required_experience?.required_experience_in_months) {
              case 0: 
              case undefined:
              case null: experienceLevel = 'Entry-level'; break;
              case 12:
              case 24:
              case 36: experienceLevel = 'Mid-level'; break;
              default: experienceLevel = item.job_required_experience?.required_experience_in_months > 36 ? 'Senior-level' : 'Entry-level';
            }

            // Parse salary range - this is a simplification
            let minSalary = 0;
            let maxSalary = 0;
            
            if (item.job_min_salary) {
              minSalary = parseInt(item.job_min_salary, 10);
            }
            
            if (item.job_max_salary) {
              maxSalary = parseInt(item.job_max_salary, 10);
            }
            
            // Fallback coordinates if not provided
            const lat = item.job_latitude || (Math.random() * (28.7 - 8.4) + 8.4); // Random within India
            const lng = item.job_longitude || (Math.random() * (97.4 - 68.1) + 68.1);

            return {
              id: parseInt(Date.now().toString().slice(-5) + Math.floor(Math.random() * 1000), 10),
              title: item.job_title || 'Unknown Position',
              company: item.employer_name || 'Unknown Company',
              location: item.job_city || item.job_country || 'India',
              lat,
              lng,
              description: item.job_description?.slice(0, 200) + '...' || 'No description available',
              salary: item.job_salary || 'Not specified',
              skills: item.job_required_skills?.split(',').map((s: string) => s.trim()) || [],
              industry: matchIndustry(item.job_title || ''),
              jobType,
              experienceLevel,
              salaryRange: { min: minSalary, max: maxSalary || minSalary + 500000 },
              url: item.job_apply_link || `https://example.com/jobs/${item.job_id}`
            };
          });
        }
        
        console.log('Processed API jobs:', apiJobs);
      } catch (apiError) {
        console.error('API error:', apiError);
        // Fall back to mock data if API fails
        apiJobs = mockApiResponse();
      }

      // Combine with existing jobs and update state
      const newJobs = [...initialJobs, ...apiJobs];
      setJobs(newJobs);
      
    } catch (err) {
      console.error('Error fetching job data:', err);
      setError(t('jobLocations.fetchError', 'Failed to fetch job data. Please try again later.'));
      // Fall back to initial jobs
      setJobs(initialJobs);
    } finally {
      setIsLoading(false);
    }
  };

  // Mock API response for testing or when API is unavailable
  const mockApiResponse = () => {
    return [
      {
        id: 101,
        title: 'Senior React Developer',
        company: 'TechFusion Systems',
        location: 'Bangalore',
        lat: 12.9716,
        lng: 77.5946,
        description: 'Looking for an experienced React developer to join our growing team.',
        salary: '₹120,000 - ₹180,000 per month',
        skills: ['React', 'TypeScript', 'Redux', 'CSS'],
        industry: 'technology',
        jobType: 'Full-time',
        experienceLevel: 'Senior-level',
        salaryRange: { min: 1440000, max: 2160000 },
        url: 'https://example.com/apply-job1'
      },
      {
        id: 102,
        title: 'Product Manager',
        company: 'InnovateX',
        location: 'Mumbai',
        lat: 19.0760,
        lng: 72.8777,
        description: 'Lead product strategy and development for our fintech platform.',
        salary: '₹18,00,000 - ₹25,00,000 per year',
        skills: ['Product Management', 'Agile', 'User Research', 'Strategy'],
        industry: 'technology',
        jobType: 'Full-time',
        experienceLevel: 'Mid-level',
        salaryRange: { min: 1800000, max: 2500000 },
        url: 'https://example.com/apply-job2'
      },
      {
        id: 103,
        title: 'Python Developer',
        company: 'DataSmart Analytics',
        location: 'Delhi',
        lat: 28.7041,
        lng: 77.1025,
        description: 'Python developer with experience in data analysis and machine learning.',
        salary: '₹8,00,000 - ₹12,00,000 per year',
        skills: ['Python', 'Data Analysis', 'Machine Learning', 'SQL'],
        industry: 'analytics',
        jobType: 'Full-time',
        experienceLevel: 'Entry-level',
        salaryRange: { min: 800000, max: 1200000 },
        url: 'https://example.com/apply-job3'
      },
      {
        id: 104,
        title: 'Frontend Designer',
        company: 'CreativeWorks',
        location: 'Pune',
        lat: 18.5204,
        lng: 73.8567,
        description: 'Design and implement responsive user interfaces for web applications.',
        salary: '₹50,000 - ₹70,000 per month',
        skills: ['HTML', 'CSS', 'JavaScript', 'UI/UX'],
        industry: 'design',
        jobType: 'Contract',
        experienceLevel: 'Mid-level',
        salaryRange: { min: 600000, max: 840000 },
        url: 'https://example.com/apply-job4'
      },
      {
        id: 105,
        title: 'Part-time Content Writer',
        company: 'ContentPlus',
        location: 'Chennai',
        lat: 13.0827,
        lng: 80.2707,
        description: 'Create engaging content for blogs, social media, and websites.',
        salary: '₹300 - ₹500 per hour',
        skills: ['Content Writing', 'SEO', 'Copywriting', 'Research'],
        industry: 'marketing',
        jobType: 'Part-time',
        experienceLevel: 'Entry-level',
        salaryRange: { min: 600000, max: 1000000 },
        url: 'https://example.com/apply-job5'
      }
    ];
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ 
        fontSize: '2rem', 
        fontWeight: 'bold',
        marginBottom: '24px',
        textAlign: 'center',
        background: 'linear-gradient(to right, #4f46e5 20%, #8b5cf6 40%, #3b82f6 60%, #4f46e5 80%)',
        backgroundSize: '200% auto',
        color: '#000',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: 'shine 3s linear infinite'
      }}>
        {t('jobLocations.title', 'Explore Job Opportunities')}
      </h1>

      <div style={{ 
        marginBottom: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <p style={{ 
          fontSize: '1rem',
          color: '#d1d5db',
          maxWidth: '800px'
        }}>
          {t('jobLocations.description', 'Discover job opportunities across India. Use the map to explore positions in different cities and filter by industry to find the perfect match for your skills and interests.')}
        </p>

        {/* Search and location controls */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
          <LocationSearch onSelectLocation={handleLocationSelect} />
          <UserLocationButton onGetLocation={handleGetUserLocation} />
        </div>
      </div>

      {/* Filters section */}
      <div style={{
        backgroundColor: 'rgba(31, 41, 55, 0.8)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px',
        border: '1px solid #374151',
      }}>
        <h3 style={{ 
          fontSize: '1rem',
          fontWeight: '600',
          marginBottom: '12px',
          color: '#e5e7eb'
        }}>
          {t('jobLocations.filters', 'Filter Jobs')}
        </h3>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px'
        }}>
          {/* Industry filter */}
          <div>
            <label htmlFor="industry-filter" style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem', color: '#9ca3af' }}>
              {t('jobLocations.filterByIndustry', 'Industry:')}
            </label>
            <select
              id="industry-filter"
              value={selectedIndustry}
              onChange={handleIndustryChange}
              style={{
                width: '100%',
                backgroundColor: 'rgba(31, 41, 55, 0.8)',
                color: '#e5e7eb',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #374151',
                outline: 'none',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              {industries.map(industry => (
                <option key={industry.id} value={industry.id}>
                  {industry.name}
                </option>
              ))}
            </select>
          </div>

          {/* Job Type filter */}
          <div>
            <label htmlFor="job-type-filter" style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem', color: '#9ca3af' }}>
              {t('jobLocations.filterByJobType', 'Job Type:')}
            </label>
            <select
              id="job-type-filter"
              value={jobTypeFilter}
              onChange={handleJobTypeChange}
              style={{
                width: '100%',
                backgroundColor: 'rgba(31, 41, 55, 0.8)',
                color: '#e5e7eb',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #374151',
                outline: 'none',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              {jobTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Experience Level filter */}
          <div>
            <label htmlFor="experience-filter" style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem', color: '#9ca3af' }}>
              {t('jobLocations.filterByExperience', 'Experience:')}
            </label>
            <select
              id="experience-filter"
              value={experienceLevelFilter}
              onChange={handleExperienceLevelChange}
              style={{
                width: '100%',
                backgroundColor: 'rgba(31, 41, 55, 0.8)',
                color: '#e5e7eb',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #374151',
                outline: 'none',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              {experienceLevels.map(level => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>
          </div>

          {/* Salary Range filter */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem', color: '#9ca3af' }}>
              {t('jobLocations.filterBySalary', 'Salary Range:')} 
              <span style={{ color: '#d1d5db', marginLeft: '8px' }}>
                ₹{(salaryRangeFilter[0]/100000).toFixed(1)}L - ₹{(salaryRangeFilter[1]/100000).toFixed(1)}L
              </span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="range"
                min="0"
                max="5000000"
                step="50000"
                value={salaryRangeFilter[0]}
                onChange={(e) => handleSalaryRangeChange([parseInt(e.target.value), salaryRangeFilter[1]])}
                style={{ 
                  flex: 1,
                  accentColor: '#4f46e5'
                }}
              />
              <input
                type="range"
                min="0"
                max="5000000"
                step="50000"
                value={salaryRangeFilter[1]}
                onChange={(e) => handleSalaryRangeChange([salaryRangeFilter[0], parseInt(e.target.value)])}
                style={{ 
                  flex: 1,
                  accentColor: '#4f46e5'
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Favorites toggle and refresh button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              type="checkbox" 
              id="show-favorites"
              checked={showFavorites}
              onChange={toggleShowFavorites}
              style={{ accentColor: '#4f46e5' }}
            />
            <label htmlFor="show-favorites" style={{ color: '#e5e7eb', fontSize: '0.875rem', cursor: 'pointer' }}>
              {t('jobLocations.showFavorites', 'Show Favorites Only')}
              {favoriteJobs.length > 0 && ` (${favoriteJobs.length})`}
            </label>
          </div>
          
          <button
            onClick={fetchJobData}
            disabled={isLoading}
            style={{
              backgroundColor: isLoading ? 'rgba(55, 65, 81, 0.5)' : 'rgba(79, 70, 229, 0.2)',
              color: isLoading ? '#9ca3af' : '#a5b4fc',
              padding: '8px 12px',
              borderRadius: '6px',
              border: `1px solid ${isLoading ? '#4b5563' : '#4f46e5'}`,
              outline: 'none',
              fontSize: '0.875rem',
              cursor: isLoading ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginLeft: 'auto'
            }}
          >
            {isLoading ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="15 85" />
                </svg>
                {t('jobLocations.loading', 'Loading...')}
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                </svg>
                {t('jobLocations.refresh', 'Refresh Jobs')}
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid #ef4444',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '16px',
          color: '#f87171'
        }}>
          {error}
        </div>
      )}

      <div style={{ 
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr',
        gap: '24px',
        height: isMobile ? 'auto' : '600px'
      }}>
        {/* Job Listings Panel */}
        <div style={{ 
          backgroundColor: 'rgba(31, 41, 55, 0.8)',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid #374151',
          overflowY: 'auto',
          maxHeight: isMobile ? '300px' : '600px'
        }}>
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600', 
            marginBottom: '16px',
            color: '#e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>
              {t('jobLocations.availableJobs', 'Available Jobs')}
              {isLoading && (
                <span style={{ 
                  fontSize: '0.75rem',
                  color: '#9ca3af',
                  marginLeft: '8px'
                }}>
                  {t('jobLocations.refreshing', '(Refreshing...)')}
                </span>
              )}
            </span>
            <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
              {filteredJobs.length} {t('jobLocations.found', 'found')}
            </span>
          </h2>
          
          {filteredJobs.length === 0 ? (
            <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>
              {isLoading 
                ? t('jobLocations.loadingJobs', 'Loading jobs...')
                : t('jobLocations.noJobsFound', 'No jobs found for the selected criteria.')}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredJobs.map(job => (
                <div 
                  key={job.id}
                  onClick={() => handleJobClick(job.id)}
                  style={{
                    backgroundColor: selectedJob === job.id ? 'rgba(79, 70, 229, 0.2)' : 'rgba(55, 65, 81, 0.5)',
                    borderRadius: '8px',
                    padding: '16px',
                    cursor: 'pointer',
                    border: `1px solid ${selectedJob === job.id ? '#4f46e5' : '#4b5563'}`,
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  onMouseOver={(e) => { 
                    if (selectedJob !== job.id) {
                      e.currentTarget.style.backgroundColor = 'rgba(55, 65, 81, 0.8)' 
                    }
                  }}
                  onMouseOut={(e) => { 
                    if (selectedJob !== job.id) {
                      e.currentTarget.style.backgroundColor = 'rgba(55, 65, 81, 0.5)' 
                    }
                  }}
                >
                  {/* Favorite toggle button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(job.id);
                    }}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: isFavorite(job.id) ? '#f59e0b' : '#9ca3af',
                      padding: '4px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title={isFavorite(job.id) ? t('jobLocations.removeFromFavorites', 'Remove from favorites') : t('jobLocations.addToFavorites', 'Add to favorites')}
                  >
                    <BookmarkIcon width={20} height={20} />
                  </button>

                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    marginBottom: '8px',
                    paddingRight: '28px' // Add padding to accommodate favorite button
                  }}>
                    <h3 style={{ fontWeight: '600', fontSize: '1rem', color: '#e5e7eb' }}>{job.title}</h3>
                    <span style={{ 
                      backgroundColor: 'rgba(79, 70, 229, 0.1)', 
                      borderRadius: '9999px', 
                      padding: '2px 8px',
                      fontSize: '0.75rem',
                      color: '#a5b4fc'
                    }}>
                      {job.location}
                    </span>
                  </div>
                  
                  <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '8px' }}>{job.company}</p>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                    {/* Job type badge */}
                    {job.jobType && (
                      <span style={{
                        backgroundColor: 'rgba(55, 65, 81, 0.5)',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '0.75rem',
                        color: '#d1d5db',
                      }}>
                        {job.jobType}
                      </span>
                    )}

                    {/* Experience level badge */}
                    {job.experienceLevel && (
                      <span style={{
                        backgroundColor: 'rgba(55, 65, 81, 0.5)',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '0.75rem',
                        color: '#d1d5db',
                      }}>
                        {job.experienceLevel}
                      </span>
                    )}

                    {/* "New" badge for API-fetched jobs */}
                    {job.id > 100 && (
                      <span style={{
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '0.75rem',
                        color: '#34d399',
                        display: 'inline-block'
                      }}>
                        {t('jobLocations.new', 'New')}
                      </span>
                    )}

                    {/* Favorite badge */}
                    {isFavorite(job.id) && (
                      <span style={{
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '0.75rem',
                        color: '#f59e0b',
                        display: 'inline-block'
                      }}>
                        {t('jobLocations.favorite', 'Favorite')}
                      </span>
                    )}
                  </div>
                  
                  {selectedJob === job.id && (
                    <div style={{ marginTop: '12px' }}>
                      <p style={{ fontSize: '0.875rem', color: '#d1d5db', marginBottom: '8px' }}>
                        {job.description}
                      </p>
                      <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '8px' }}>
                        <strong>{t('jobLocations.salary', 'Salary')}:</strong> {job.salary}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                        {job.skills.map((skill, index) => (
                          <span 
                            key={index}
                            style={{
                              fontSize: '0.75rem',
                              padding: '2px 6px',
                              backgroundColor: 'rgba(55, 65, 81, 0.5)',
                              borderRadius: '4px',
                              color: '#d1d5db',
                            }}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(job.url || '#', '_blank');
                          }}
                          style={{
                            backgroundColor: '#4f46e5',
                            color: 'white',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            flex: 1
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#4338ca' }}
                          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#4f46e5' }}
                        >
                          {t('jobLocations.applyNow', 'Apply Now')}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(job.id);
                          }}
                          style={{
                            backgroundColor: isFavorite(job.id) ? 'rgba(245, 158, 11, 0.2)' : 'rgba(55, 65, 81, 0.5)',
                            color: isFavorite(job.id) ? '#f59e0b' : '#9ca3af',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: `1px solid ${isFavorite(job.id) ? '#f59e0b' : '#4b5563'}`,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <BookmarkIcon width={16} height={16} />
                          {isFavorite(job.id) 
                            ? t('jobLocations.removeFromFavorites', 'Remove from favorites')
                            : t('jobLocations.addToFavorites', 'Add to favorites')
                          }
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map Section */}
        <div style={{ 
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid #374151',
          height: isMobile ? '400px' : '600px'
        }}>
          <MapContainer 
            center={[20.5937, 78.9629]} // Initial center of India
            zoom={5} 
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
            ref={(ref) => { mapRef.current = ref; }}
          >
            <TileLayer
              attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
              url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
            />
            
            {/* User location marker */}
            {showUserLocation && userLocation && (
              <UserLocationMarker position={userLocation} />
            )}
            
            {/* Update center when mapCenter changes */}
            <SetMapCenter center={mapCenter} zoom={mapZoom} />
            
            {/* Job markers with clustering */}
            <MarkerClusterGroup
              iconCreateFunction={createClusterCustomIcon}
              maxClusterRadius={50}
              spiderfyOnMaxZoom={true}
              showCoverageOnHover={false}
            >
              {filteredJobs.map(job => (
                <Marker 
                  key={job.id} 
                  position={[job.lat, job.lng]}
                  icon={job.id > 100 ? new Icon({
                    iconUrl: markerIcon,
                    shadowUrl: markerShadow,
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41],
                    className: 'new-job-marker' // Add a class for styling
                  }) : defaultIcon}
                  eventHandlers={{
                    click: () => {
                      handleJobClick(job.id);
                    },
                  }}
                >
                  <Popup>
                    <div style={{ padding: '4px' }}>
                      <h3 style={{ fontWeight: 'bold', marginBottom: '4px' }}>{job.title}</h3>
                      <p style={{ fontSize: '14px', marginBottom: '4px' }}>{job.company}</p>
                      <p style={{ fontSize: '12px', marginBottom: '4px' }}>{job.location}</p>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
                        {/* Job type badge */}
                        {job.jobType && (
                          <span style={{
                            backgroundColor: '#f3f4f6',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '10px',
                            color: '#1f2937',
                            display: 'inline-block'
                          }}>
                            {job.jobType}
                          </span>
                        )}
                        
                        {/* New badge */}
                        {job.id > 100 && (
                          <span style={{
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '10px',
                            color: '#34d399',
                            display: 'inline-block'
                          }}>
                            {t('jobLocations.new', 'New')}
                          </span>
                        )}
                        
                        {/* Favorite badge */}
                        {isFavorite(job.id) && (
                          <span style={{
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '10px',
                            color: '#f59e0b',
                            display: 'inline-block'
                          }}>
                            {t('jobLocations.favorite', 'Favorite')}
                          </span>
                        )}
                      </div>
                      
                      <button
                        onClick={() => handleJobClick(job.id)}
                        style={{
                          backgroundColor: '#4f46e5',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: 'none',
                          fontSize: '12px',
                          cursor: 'pointer',
                          width: '100%',
                          marginTop: '4px'
                        }}
                      >
                        {t('jobLocations.viewDetails', 'View Details')}
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>
          </MapContainer>
        </div>
      </div>

      <div style={{ 
        display: 'flex',
        justifyContent: 'center',
        marginTop: '24px',
        padding: '16px',
        backgroundColor: 'rgba(31, 41, 55, 0.8)',
        borderRadius: '8px',
        border: '1px solid #374151'
      }}>
        <p style={{ color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center' }}>
          {t('jobLocations.dataDisclaimer', 'Job data is updated regularly. Last updated: October 2023. Apply for jobs directly through the employer websites.')}
        </p>
      </div>
    </div>
  );
};

export default JobLocations; 