import Card from "@/components/ui/Card";
import Link from "next/link";

export default function DashboardHome() {
  const stats = [
    {
      label: "Total Audits",
      value: "—",
      description: "Coming soon",
      href: "/audits",
      color: "text-primary-600",
      bgColor: "bg-primary-50",
    },
    {
      label: "Active Observations",
      value: "—",
      description: "Coming soon",
      href: "/observations",
      color: "text-warning-600",
      bgColor: "bg-warning-50",
    },
    {
      label: "Plants",
      value: "—",
      description: "Manage facilities",
      href: "/plants",
      color: "text-success-600",
      bgColor: "bg-success-50",
    },
    {
      label: "Reports",
      value: "—",
      description: "View analytics",
      href: "/reports",
      color: "text-neutral-600",
      bgColor: "bg-neutral-50",
    },
  ];

  const quickActions = [
    { label: "Create New Audit", href: "/audits", icon: "📋" },
    { label: "Add Observation", href: "/observations", icon: "📝" },
    { label: "View Reports", href: "/reports", icon: "📊" },
    { label: "Manage Plants", href: "/plants", icon: "🏭" },
  ];

  return (
    <div className="space-y-8">
      {/* S-Tier: Enhanced header typography */}
      <div>
        <h1 className="text-4xl font-bold text-neutral-900">Dashboard</h1>
        <p className="text-base text-neutral-600 mt-2">
          Welcome to your Internal Audit Platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="group">
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 h-full transition-all duration-250 ease-out hover:shadow-lg hover:-translate-y-1 hover:border-primary-300">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-neutral-600 uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className={`text-4xl font-bold mt-3 mb-2 ${stat.color}`}>
                    {stat.value}
                  </p>
                  <p className="text-sm text-neutral-600">
                    {stat.description}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor} transition-transform duration-250 group-hover:scale-110`}>
                  <div className={`h-6 w-6 ${stat.color}`}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <Card padding="lg">
        <h2 className="text-xl font-semibold text-neutral-900 mb-6">
          Quick Actions
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href} className="group">
              <div className="flex items-center gap-4 p-5 rounded-lg border-2 border-neutral-200 hover:border-primary-400 hover:bg-primary-50 transition-all duration-250 ease-out cursor-pointer shadow-sm hover:shadow-md">
                <div className="flex-shrink-0 text-3xl transition-transform duration-250 group-hover:scale-110 group-hover:rotate-3">
                  {action.icon}
                </div>
                <span className="text-sm font-semibold text-neutral-800 group-hover:text-primary-700">
                  {action.label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      {/* Recent Activity - Placeholder */}
      <Card padding="lg">
        <h2 className="text-xl font-semibold text-neutral-900 mb-6">
          Recent Activity
        </h2>
        <div className="text-center py-16 px-6 bg-neutral-50 rounded-xl">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-neutral-100 rounded-full">
              <svg
                className="h-12 w-12 text-neutral-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">No recent activity</h3>
          <p className="text-sm text-neutral-600 max-w-md mx-auto leading-relaxed">
            Your recent audit activities and updates will appear here. Start by creating an audit or observation to see activity.
          </p>
        </div>
      </Card>
    </div>
  );
}