/**
 * Controller resource dibangun sekali di sini supaya route publik dan route
 * admin memakai instance yang sama, dan tidak ada handler yang dibuat berulang
 * setiap kali berkas route di-import.
 */

import { collectionResources } from '../models/resources.js'
import { createResourceController } from './resource.controller.js'

export const resourceControllers = new Map(
  collectionResources.map((resource) => [resource.name, createResourceController(resource)]),
)
