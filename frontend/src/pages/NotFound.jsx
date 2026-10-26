import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui';

export default function NotFound() {
  return (
    <EmptyState title="Página não encontrada">
      <p>Esse barril está vazio.</p>
      <Link to="/" className="btn btn-primary mt-6">
        Voltar ao catálogo
      </Link>
    </EmptyState>
  );
}
