#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MolamaOnAwsEcsStack } from '../lib/molama-on-aws-ecs-stack';

const app = new cdk.App();
new MolamaOnAwsEcsStack(app, 'MolamaOnAwsEcsStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});