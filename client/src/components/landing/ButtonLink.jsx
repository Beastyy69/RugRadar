// The landing page's call-to-action links. Router links for in-app routes,
// plain anchors for in-page (#section) and external targets, one look -
// shared with every other button via lib/buttonStyles.

import { Link } from "react-router-dom";

import { buttonClasses } from "../../lib/buttonStyles";

function ButtonLink({ to, href, variant = "primary", size = "md", className = "", children, ...props }) {
  const classes = `${buttonClasses({ variant, size })} ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={classes} {...props}>
      {children}
    </a>
  );
}

export default ButtonLink;
