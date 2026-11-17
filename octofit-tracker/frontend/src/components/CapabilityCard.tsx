import { useEffect, useState, type ReactNode } from 'react';
import { getJson } from '../api/client.js';

type Props<T> = {
  title: string;
  description: string;
  endpoint: string;
  emptyText: string;
  renderContent: (data: T) => ReactNode;
};

export function CapabilityCard<T>({ title, description, endpoint, emptyText, renderContent }: Props<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getJson<T>(endpoint)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load data');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [endpoint]);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">{title}</h2>
        <p>{description}</p>
        {loading && <p role="status">Loading...</p>}
        {!loading && error && <p role="alert">Unable to load data: {error}</p>}
        {!loading && !error && data !== null && (
          renderContent(data) || <p>{emptyText}</p>
        )}
      </div>
    </section>
  );
}
