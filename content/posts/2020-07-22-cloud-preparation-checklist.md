+++
title = "Cloud preparation checklist"
description = "Considering a move to the cloud? Read up on cloud advantages, common pain points, and our recommended step by step process"
date = 2020-07-22
author = "Sibi Prabakaran"
path = "posts/2020-07-22-cloud-preparation-checklist.html"

[taxonomies]
tags = ["devops"]
+++

> **Mirrored from FP Complete.** The original FP Complete site is no longer available, so this post is mirrored here. [Read the archived original on the Wayback Machine](https://web.archive.org/web/20240530073559/https://www.fpcomplete.com/blog/cloud-preparation-checklist/).

While moving to the cloud brings many benefits associated with it, we
need to also be aware of the pain points associated with such a move.
This post will discuss those pain points, provide ways to mitigate them, and
give you a checklist which can be used if you plan to migrate your
applications to cloud. We will also discuss the advantages of
moving to the cloud.

## Common pain points

One of the primary pain points in moving to the cloud is selecting the
appropriate tools for a specific usecase. We have an abundance of tools
available, with many solving the same problem in different ways. To give
you a basic idea, this is the CNCF\'s (Cloud Native Computing
Foundation) recommended path through the cloud native technologies:

<img src="/images/posts/cloud-preparation-checklist/landscape.png" alt="Cloud Native Landscape" title="Cloud Native Landscape" width="100%">

<p></p>

Picking the right tool is hard, and this is where having experience
with them comes in handy.

Also, the existing knowledge of on-premises data centers may not be
directly transferable when you plan to move to the cloud. An individual might
have to undergo a basic training to understand the terminology and the
concepts used by a particular cloud vendor. An on-premises system
administrator might be used to setting up firewalls via
[Iptables](https://en.wikipedia.org/wiki/Iptables), but he might also
want to consider using [Security
groups](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html)
if he plans to accomplish the same goals in the AWS ecosystem (for EC2 instances).

Another point to consider while moving to the cloud is the ease with which you
can easily get locked in to a single vendor. You might start using
Amazon's [Auto Scaling
Groups](https://docs.aws.amazon.com/autoscaling/ec2/userguide/AutoScalingGroup.html)
to automatically handle the load of your application. But when you plan
to switch to another cloud vendor the migration might not be
straightforward. Switching between cloud services isn\'t easy, and if you want portability, you
need to make sure that your applications are built with a multi-cloud
strategy. This will allow you to easily switch between vendors if such a
scenario arises. Taking advantage of containers and Kubernetes may give
you additional flexibility and ease portability between different cloud
vendors.

## Advantages of moving

Despite the pain points listed above, there are many advantages involved in
moving your applications to cloud. Note that even big media services
provider like
[Netflix](https://netflixtechblog.com/four-reasons-we-choose-amazons-cloud-as-our-computing-platform-4aceb692afec)
has moved on to the cloud instead of building and managing their own
data center solution.

### Cost

One of the primary advantages of leveraging the cloud is avoiding
the cost of building your
own data center. Building a secure data center is not trivial. By
offloading this activity to an external cloud provider, you can instead build your
applications on top of the infrastructure provided by them. This not
only saves the initial capital expenditure but also saves headaches from
replacing hardware, such as replacing failing network switches. But note that
switching to the cloud will not magically save cost. Depending on your
application\'s architecture and workload, you have to be aware of the
choices you make and make sure that your choices are cost efficient.

### Uptime

Cloud vendors provide SLAs (Service Level Agreements) where they state
information about uptime and the guarantees they make. This is a
snapshot from the Amazon Compute SLA:

![SLA](/images/posts/cloud-preparation-checklist/sla.png "SLA")

All major cloud providers have historically provided excellent uptime,
especially for applications that properly leverage availability zones.
But depending on a specific
usecase/applications, you should define the acceptable uptime for your
application and make sure that your SLA matches with it. Also depending
on the requirements, you can architect your application such that it has
multi region deployments to provide a better uptime in case there is an
outage in one region.

### Security and Compliance

Cloud deployments provide an extra benefit when working in regulated industries
or with government projects. In many cases, cloud vendors provide regulation-compliant
hardware.
By using cloud providers, we can take advantage of the various
compliance standards (eg: HIPAA, PCI etc) they meet.
Validating an on-premises data center against such standards can be a time consuming,
expensive process. Relying on already validated hardware can be faster, cheaper, easier,
and more reliable.

Broadening the security topic, cloud vendors typically also provide
a wide range of additional security tools.

Despite these boons,
proper care must still be taken, and best practices must still be followed,
to deploy an application securely.
Also, be aware that running on compliant hardware does not automatically
ensure compliance of the software. Code and infrastructure must still meet
various standards.

### Ease of scaling

With cloud providers, you can easily add and remove machines or add more
power (RAM, CPU etc) to them. The ease with which you can horizontally and
vertically scale your application without worrying about your
infrastructure is powerful, and can revolutionize how your approach
hardware allocation. As your applications load increases,
you can easily scale up in a few minutes.

One of the perhaps surprising benefits of this is that you don't need to
preemptively scale up your hardware. Many cloud deployments are able
to reduce the total compute capacity available in a cluster, relying
on the speed of cloud providers to scale up in response to increases in demand.

### Focus on problem solving

With no efforts in maintaining the on-premises data center, you can
instead put your effort in your application and the problem it solves.
This allows you to focus on your core business problems and your
customers.

While not technically important, the cloud providers have energy
efficient data centers and run it on better efficiency. As a case study,
[Google even uses machine learning technology to make its data centers
more
efficient](https://cloud.google.com/blog/topics/google-cloud-next/our-heads-in-the-cloud-but-were-keeping-the-earth-in-mind).
Hence, it might be environmentally a better decision to run your
applications on cloud.

## Getting ready for Cloud

Once you are ready for migrating to the cloud, you can plan for the next
steps and initiate the process. We have the following general checklist
which we usually take and tailor it based on our clients requirements:

### Checklist

-   Make a list of your applications and dependencies which need to be
    migrated.
-   Benchmark your applications to establish cloud performance
    KPIs (Key Performance Indicators).
-   List out any required compliance requirements for your
    application and plan for ensuring it.
-   Onboard relevant team members to the cloud service's use management
    system, ideally integrating with existing user directories and
    leveraging features like single sign on and automated user provisioning.
-   Establish access controls to your cloud service, relying on role based
    authorization techniques.
-   Evaluate your migration options. You might want to re-architect it
    to take advantage of cloud-native technologies. Or you might simply
    decide to shift the existing application without any changes.
-   Create your migration plan in a Runbook.
-   Have a rollback plan in case migration fails.
-   Test your migration and rollback plans in a separate environment.
-   Communicate about the migration to internal stakeholders and customers.
-   Execute your cloud migration.
-   Prune your on-premises infrastructure.
-   Optimize your cloud infrastructure for your workloads.

## Conclusion

I hope we were able to present you the challenges involved in
migration to cloud and how to prepare for them. We have helped various
companies in migration and other devops services. Free feel to [reach out to
us](https://www.fpcomplete.com/contact-us/) regarding any questions on
cloud migrations or any of the other services.
