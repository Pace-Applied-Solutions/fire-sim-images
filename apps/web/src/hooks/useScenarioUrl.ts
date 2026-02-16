/**
 * Hook for synchronizing scenario state with URL parameters.
 * Enables scenario sharing and refresh safety.
 */

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { generationApi } from '../services/generationApi';
import { useAppStore } from '../store/appStore';
import { useToastStore } from '../store/toastStore';

export const useScenarioUrl = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToast } = useToastStore();
  const hasLoadedRef = useRef(false);

  const {
    setPerimeter,
    setGeoContext,
    setScenarioInputs,
    setGenerationResult,
    setScenarioState,
    setError,
    generationResult,
  } = useAppStore();

  // Load scenario from URL parameter on mount
  useEffect(() => {
    const scenarioId = searchParams.get('scenario');

    if (!scenarioId || hasLoadedRef.current) {
      return;
    }

    const loadScenario = async () => {
      try {
        hasLoadedRef.current = true;
        setScenarioState('generating'); // Show loading state
        
        const scenario = await generationApi.getScenario(scenarioId);

        // Restore all scenario state
        setPerimeter(scenario.perimeter);
        setGeoContext(scenario.geoContext);
        setScenarioInputs(scenario.inputs);
        setGenerationResult(scenario.result);

        // Set final state based on result status
        if (scenario.result.status === 'completed') {
          setScenarioState('complete');
        } else if (scenario.result.status === 'failed') {
          setScenarioState('error');
          setError(scenario.result.error || 'Generation failed');
        } else {
          setScenarioState('complete'); // Treat in_progress/pending as complete for now
        }

        addToast({
          type: 'success',
          message: 'Scenario loaded successfully',
        });
      } catch (error) {
        console.error('Failed to load scenario from URL:', error);
        hasLoadedRef.current = false; // Allow retry
        
        const errorMsg = error instanceof Error ? error.message : 'Failed to load scenario';
        setError(errorMsg);
        setScenarioState('error');
        
        addToast({
          type: 'error',
          message: `Failed to load scenario: ${errorMsg}`,
        });
        
        // Remove invalid scenario parameter
        searchParams.delete('scenario');
        setSearchParams(searchParams, { replace: true });
      }
    };

    loadScenario();
  }, [
    searchParams,
    setPerimeter,
    setGeoContext,
    setScenarioInputs,
    setGenerationResult,
    setScenarioState,
    setError,
    setSearchParams,
    addToast,
  ]);

  // Update URL when a new scenario is generated
  useEffect(() => {
    if (generationResult?.id && generationResult.status === 'completed') {
      const currentScenarioId = searchParams.get('scenario');
      
      // Only update if the scenario ID changed
      if (currentScenarioId !== generationResult.id) {
        setSearchParams({ scenario: generationResult.id }, { replace: false });
      }
    }
  }, [generationResult, searchParams, setSearchParams]);
};
