import { Link, Outlet, useNavigate } from 'react-router';
import { DevRoutePath } from '../../RoutePath';
import { Button } from '../../common/components/ui/button';

export function DevMenu() {
  const navigate = useNavigate();

  const goBack = () => navigate(-1);

  return (
    <>
      <header className="absolute top-0 left-0 z-100 flex gap-4 items-center bg-red-600 p-2 border-1 border-white border-dashed opacity-50">
        <Button onClick={goBack}>Go back</Button>
        <span>|</span>
        <Link to={DevRoutePath.PUTINS_PUPPET}>Putin's Puppet Falsetto</Link>
        <span>|</span>
        <Link to={DevRoutePath.RESULTS_DIALOG}>Result dialogs</Link>
      </header>

      <Outlet />
    </>
  );
}
