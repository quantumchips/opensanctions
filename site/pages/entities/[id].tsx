import { useState, useEffect } from 'react';
import { GetStaticPropsContext } from 'next'
import Head from 'next/head';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import Layout from '../../components/Layout'
import { getDatasetByName, getEntityById, getEntityIds, fetchIndex } from '../../lib/data'
import { IDataset, IOpenSanctionsEntity, OpenSanctionsEntity } from '../../lib/types'
import { Summary } from '../../components/util'
import { getSchemaEntityPage } from '../../lib/schema';

import { BASE_URL } from '../../lib/constants';

import styles from '../../styles/Entity.module.scss'
import { IModelDatum, Model } from '@alephdata/followthemoney';
import Dataset from '../../components/Dataset';
import { PropertyValues } from '../../components/Property';
import { EntityCard } from '../../components/Entity';

type CanonicalRedirectProps = {
  entity: IOpenSanctionsEntity
}

function CanonicalRedirect({ entity }: CanonicalRedirectProps) {
  const url = `${BASE_URL}/entities/${entity.id}/`
  return (
    <>
      <Head>
        <title>Redirect to {entity.caption}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta http-equiv="refresh" content={`0; url=${url}`} />
      </Head>
      <p>
        See: <a href={url}>{entity.caption}</a>
      </p>
    </>
  );
}

type DatasetScreenProps = {
  id: string,
  data: IOpenSanctionsEntity,
  modelData: IModelDatum,
  datasets: Array<IDataset>
}


export default function EntityScreen({ id, data, modelData, datasets }: DatasetScreenProps) {
  if (data.id !== id) {
    return <CanonicalRedirect entity={data} />
  }
  const model = new Model(modelData)
  const entity = OpenSanctionsEntity.fromData(model, data)
  const structured = getSchemaEntityPage(entity, datasets)
  const properties = entity.getDisplayProperties();
  const sidebarProperties = properties.filter((p) => p.type.name !== 'entity' && p.name !== 'notes');
  const entityProperties = properties.filter((p) => p.type.name === 'entity');
  return (
    <Layout.Base title={entity.caption} structured={structured}>
      <Container>
        <h1>
          {entity.caption}
        </h1>
        <Row>
          <Col md={3}>
            <p>
              <strong>Type</strong><br />
              <span>{entity.schema.label}</span>
            </p>
            {sidebarProperties.map((prop) =>
              <p key={prop.name}>
                <strong>{prop.label}</strong><br />
                <span><PropertyValues prop={prop} values={entity.getProperty(prop)} /></span>
              </p>
            )}
          </Col>
          <Col md={9}>
            {entity.hasProperty('notes') && (
              <div className={styles.entityPageSection}>
                {/* <h2>Notes</h2> */}
                {entity.getProperty('notes').map((v, idx) => <Summary key={idx} summary={v as string} />)}
              </div>
            )}
            {entityProperties.map((prop) =>
              <div className={styles.entityPageSection} key={prop.qname}>
                <h2>{prop.getRange().plural}</h2>
                {entity.getProperty(prop).map((value) =>
                  <EntityCard
                    key={(value as OpenSanctionsEntity).id}
                    entity={value as OpenSanctionsEntity}
                    via={prop}
                  />
                )}
              </div>
            )}
            <div className={styles.entityPageSection}>
              <h2>Data sources</h2>
              <Row>
                {datasets.map((d) => (
                  <Col md={4} key={d.name}>
                    <Dataset.Card dataset={d} />
                  </Col>
                ))}
              </Row>
            </div>
          </Col>
        </Row>
      </Container>
    </Layout.Base >
  )
}

export const getStaticProps = async (context: GetStaticPropsContext) => {
  const params = context.params!
  const id = params.id as string;
  const entity = await getEntityById(id);
  if (entity === undefined) {
    return { redirect: { destination: '/', permanent: false } };
  }
  const index = await fetchIndex();
  const datasets = await Promise.all(entity.datasets.map((name) => getDatasetByName(name)))
  return {
    props: {
      data: entity,
      datasets: datasets.filter((d) => d !== undefined),
      id,
      modelData: index.model
    }
  };
}

export async function getStaticPaths() {
  const ids = await getEntityIds()
  const paths = ids.map((id) => {
    return { params: { id } }
  })
  return {
    paths,
    fallback: false
  }
}
